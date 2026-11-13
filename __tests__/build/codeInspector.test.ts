import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import { pathToFileURL } from 'url';

const projectRoot = path.resolve(__dirname, '../..');
const extensionOrigin = 'chrome-extension://another-extension';

type RequestResult = {
  status: number | undefined;
  body: string;
  headers: http.IncomingHttpHeaders;
};

const request = (
  port: number,
  method: string,
  origin?: string
): Promise<RequestResult> =>
  new Promise((resolve, reject) => {
    const file = path.join(
      projectRoot,
      '__tests__',
      'fixtures',
      '__code_inspector_no_such_file__.ts'
    );
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: `/?file=${encodeURIComponent(file)}&line=1&column=1`,
        method,
        headers: origin ? { Origin: origin } : undefined,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, body, headers: res.headers });
        });
      }
    );
    req.setTimeout(5000, () => {
      req.destroy(new Error('Inspector request timed out'));
    });
    req.on('error', reject);
    req.end();
  });

const getAvailablePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not allocate a test port'));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });

describe('Code Inspector request security', () => {
  let child: ChildProcess;
  let port: number;
  let stderr = '';
  let clientCheck = { usesPost: false, usesGet: false };

  beforeAll(async () => {
    port = await getAvailablePort();
    const coreUrl = pathToFileURL(
      path.join(
        projectRoot,
        'node_modules',
        '@code-inspector',
        'core',
        'dist',
        'index.mjs'
      )
    ).href;
    const sourceFile = path.join(projectRoot, 'src', 'ui', 'index.tsx');
    const script = `
      import { createServer } from ${JSON.stringify(coreUrl)};
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
      const injectLoader = require(${JSON.stringify(
        require.resolve('@code-inspector/webpack/dist/inject-loader.js')
      )});
      const file = process.env.INSPECTOR_TEST_SOURCE_FILE;
      const injected = await new Promise((resolve, reject) => {
        injectLoader.call({
          async() {},
          cacheable() {},
          resourcePath: file,
          query: {
            bundler: 'webpack',
            record: {
              port: Number(process.env.INSPECTOR_TEST_PORT),
              entry: file.replace(/\\.[^.]+$/, ''),
              output: '__code_inspector_no_such_output_dir__',
            },
          },
          callback(error, result) {
            if (error) reject(error);
            else resolve(result);
          },
        }, 'export {};', null, null);
      });
      process.send({
        type: 'client',
        usesPost: injected.includes('i.open("POST",t,!0)'),
        usesGet: injected.includes('this.sendType==="xhr"?this.sendXHR():this.sendImg()'),
      });
      const server = createServer((actualPort) => {
        process.send({ type: 'listening', port: actualPort });
      }, { port: Number(process.env.INSPECTOR_TEST_PORT) });
      process.on('SIGTERM', () => server.close(() => process.exit(0)));
    `;

    child = spawn(
      process.execPath,
      ['--input-type=module', '--eval', script],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_OPTIONS: '',
          INSPECTOR_TEST_PORT: String(port),
          INSPECTOR_TEST_SOURCE_FILE: sourceFile,
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    await new Promise<void>((resolve, reject) => {
      let listening = false;
      let client = false;
      const timeout = setTimeout(() => {
        reject(new Error(`Inspector test server timed out: ${stderr}`));
      }, 25000);
      const finish = () => {
        if (listening && client) {
          clearTimeout(timeout);
          resolve();
        }
      };
      child.on('message', (message: any) => {
        if (message.type === 'listening') {
          port = message.port;
          listening = true;
        }
        if (message.type === 'client') {
          clientCheck = message;
          client = true;
        }
        finish();
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', (code) => {
        if (!listening || !client) {
          clearTimeout(timeout);
          reject(
            new Error(`Inspector test server exited with ${code}: ${stderr}`)
          );
        }
      });
    });
  }, 30000);

  afterAll(async () => {
    if (!child || child.killed) return;
    const exited = new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
    });
    child.kill('SIGTERM');
    await exited;
  });

  test('injects a client that uses POST without the image fallback', () => {
    expect(clientCheck.usesPost).toBe(true);
    expect(clientCheck.usesGet).toBe(false);
  });

  test('accepts POST from any extension origin', async () => {
    const result = await request(port, 'POST', extensionOrigin);
    expect(result.status).toBe(200);
    expect(result.body).toBe('ok');
    expect(result.headers['access-control-allow-origin']).toBe(
      extensionOrigin
    );
    expect(result.headers['access-control-allow-methods']).toBe('POST');
  });

  test('rejects POST from a web origin', async () => {
    const result = await request(port, 'POST', 'https://example.com');
    expect(result.status).toBe(403);
    expect(result.body).toBe('forbidden');
  });

  test('rejects POST without an origin', async () => {
    const result = await request(port, 'POST');
    expect(result.status).toBe(403);
    expect(result.body).toBe('forbidden');
  });

  test('rejects GET from an extension origin', async () => {
    const result = await request(port, 'GET', extensionOrigin);
    expect(result.status).toBe(405);
    expect(result.headers.allow).toBe('POST');
  });
});
