import { spawnSync } from 'child_process';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const uiRoot = path.join(projectRoot, 'src', 'ui');

type Deps = { files: string[]; dirs: string[] };

// Tailwind runs in a child process: its scanner is a native module, and the
// jsdom test environment is not where postcss normally runs.
const compileTailwindEntry = (): Deps => {
  const script = `
    const fs = require('fs');
    const postcss = require('postcss');
    const tailwind = require('@tailwindcss/postcss');
    const from = process.env.TAILWIND_ENTRY;
    postcss([tailwind])
      .process(fs.readFileSync(from, 'utf8'), { from })
      .then((result) => {
        const files = result.messages
          .filter((m) => m.type === 'dependency')
          .map((m) => m.file);
        const dirs = result.messages
          .filter((m) => m.type === 'dir-dependency')
          .map((m) => m.dir);
        process.stdout.write(JSON.stringify({ files, dirs }));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  `;
  const child = spawnSync(process.execPath, ['--eval', script], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: '',
      TAILWIND_ENTRY: path.join(uiRoot, 'style', 'tailwind.css'),
    },
    encoding: 'utf8',
    timeout: 60000,
  });
  if (child.status !== 0) {
    throw new Error(`Tailwind compile failed: ${child.stderr || child.error}`);
  }
  return JSON.parse(child.stdout);
};

const outside = (paths: string[], root: string) =>
  paths
    .map((p) => path.relative(root, p))
    .filter((rel) => rel.startsWith('..') || path.isAbsolute(rel));

describe('Tailwind source scanning', () => {
  let deps: Deps;

  beforeAll(() => {
    deps = compileTailwindEntry();
  }, 60000);

  // Every directory reported here becomes a webpack context dependency that
  // is walked on each dev start. Auto-detection from the project root used to
  // report .claude, so dev:hot walked every nested worktree and its
  // node_modules.
  test('watches only directories under src/ui', () => {
    expect(deps.dirs.length).toBeGreaterThan(0);
    expect(outside(deps.dirs, uiRoot)).toEqual([]);
  });

  test('reads only files under src/ui, apart from Tailwind itself', () => {
    const files = deps.files.filter(
      (file) => !file.includes(`${path.sep}node_modules${path.sep}`)
    );
    expect(files.length).toBeGreaterThan(0);
    expect(outside(files, uiRoot)).toEqual([]);
  });
});
