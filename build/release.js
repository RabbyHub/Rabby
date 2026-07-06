const path = require('path');
const crypto = require('crypto');
const { prompt, BooleanPrompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');
const pkg = require('../package.json');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SENTRY_CLI = path.resolve(PROJECT_ROOT, 'node_modules/.bin/sentry-cli');
const args = process.argv.slice(2);
const isYesMode = args.includes('--yes') || args.includes('-y');

const shellQuote = (value) =>
  `"${String(value).replace(/(["\\$`])/g, '\\$1')}"`;

function execOrThrow(command) {
  const result = shell.exec(command);

  if (result.code !== 0) {
    throw new Error(`[Rabby] Command failed: ${command}`);
  }
}

function updateManifestVersion(version, p, filename = 'manifest.json') {
  const manifestPath = path.resolve(PROJECT_ROOT, 'src/manifest', p, filename);
  const manifest = fs.readJSONSync(manifestPath);
  manifest.version = version;
  fs.writeJSONSync(manifestPath, manifest, { spaces: 2 });
}

function stringToUUID(value) {
  const hash = crypto.createHash('sha256').update(value).digest('hex');
  const variant = ['8', '9', 'a', 'b'][hash.slice(16, 17).charCodeAt(0) % 4];

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${variant}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function seedSourceMapDebugIds(distDir) {
  const bundlePaths = shell
    .find(distDir)
    .filter((filePath) => /\.(c|m)?js$/.test(filePath));

  let seededCount = 0;

  bundlePaths.forEach((bundlePath) => {
    const sourceMapPath = `${bundlePath}.map`;

    if (!fs.existsSync(sourceMapPath)) {
      return;
    }

    const relativeBundlePath = path.relative(distDir, bundlePath);
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    const sourceMap = fs.readJSONSync(sourceMapPath);

    sourceMap.debug_id = stringToUUID(
      `${relativeBundlePath}\n${bundleContent}`
    );
    fs.writeFileSync(sourceMapPath, JSON.stringify(sourceMap));
    seededCount += 1;
  });

  console.log(`[Rabby] Seeded ${seededCount} sourcemap debug ids`);
}

function moveSourceMapsToTmp(distDir, targetDir) {
  fs.removeSync(targetDir);
  fs.ensureDirSync(targetDir);

  const sourceMaps = shell
    .find(distDir)
    .filter((filePath) => filePath.endsWith('.map'));

  if (sourceMaps.length === 0) {
    console.error(`[Rabby] No sourcemaps found in ${distDir}`);
    return;
  }

  sourceMaps.forEach((sourceMapPath) => {
    const relativePath = path.relative(distDir, sourceMapPath);
    const targetPath = path.join(targetDir, relativePath);

    fs.ensureDirSync(path.dirname(targetPath));
    fs.moveSync(sourceMapPath, targetPath, { overwrite: true });
  });

  console.log(
    `[Rabby] Moved ${sourceMaps.length} sourcemaps to ${path.relative(
      PROJECT_ROOT,
      targetDir
    )}`
  );
}

async function release([version, isDebug, isRelease, isMV3]) {
  if (isRelease) {
    shell.exec(`npm version ${version} --force`);
    shell.exec('git add -A');
    shell.exec(`git commit -m "[release] ${version}"`);
    shell.exec(`git push origin refs/tags/v${version}`);
    shell.exec('git push origin master');
  }
  return [version, isDebug, isRelease, isMV3];
}

async function getBundleOptions() {
  const oldVersion = pkg.version;
  const plus1Version = oldVersion
    .split('.')
    .map((v, i) => (i === 2 ? +v + 1 : v))
    .join('.');

  if (isYesMode) {
    console.log(
      `[Rabby] Running in --yes mode: version=${oldVersion}, MV3=y, debug=n, release=n`
    );
    return {
      version: oldVersion,
      isMV3: true,
      isDebug: false,
      isRelease: false,
    };
  }

  const { version } = await prompt({
    type: 'input',
    name: 'version',
    message: '[Rabby] Please input the release version:',
    initial: plus1Version,
  });

  const isMV3 = await new BooleanPrompt({
    message: '[Rabby] Do you want to release to MV3? (y/N)',
  }).run();

  const isDebug = await new BooleanPrompt({
    message: '[Rabby] Do you want to build a debug version? (y/N)',
  }).run();

  const isRelease = await new BooleanPrompt({
    message: '[Rabby] Do you want to release? (y/N)',
  }).run();

  return {
    version,
    isMV3,
    isDebug,
    isRelease,
  };
}

async function bundle() {
  const { version, isMV3, isDebug, isRelease } = await getBundleOptions();
  const buildStr = isDebug ? 'build:debug' : 'build:pro';
  const distDir = path.resolve(PROJECT_ROOT, isMV3 ? 'dist' : 'dist-mv2');
  const tmpSourceMapDir = path.resolve(
    PROJECT_ROOT,
    'tmp',
    'sourcemaps',
    isMV3 ? 'mv3' : 'mv2'
  );

  updateManifestVersion(version, 'chrome-mv3');
  updateManifestVersion(version, 'chrome-mv3', 'manifest.dev.json');
  updateManifestVersion(version, 'chrome-mv2');
  updateManifestVersion(version, 'firefox-mv2');
  if (!isDebug) {
    shell.env['sourcemap'] = true;
  }
  if (isMV3) {
    execOrThrow(`cross-env VERSION=${version} yarn ${buildStr}`);
  } else {
    execOrThrow(`cross-env VERSION=${version} yarn ${buildStr}:mv2`);
  }
  if (!isDebug) {
    seedSourceMapDebugIds(distDir);
    execOrThrow(
      `${shellQuote(SENTRY_CLI)} sourcemaps inject ${shellQuote(distDir)}`
    );
    moveSourceMapsToTmp(distDir, tmpSourceMapDir);
  }
  shell.rm('-rf', './dist/*.js.map');
  shell.rm('-rf', './dist-mv2/*.js.map');
  return [version, isDebug, isRelease, isMV3];
}
async function packed([version, isDebug, , isMV3]) {
  import('./zip.mjs').then((re) => {
    re.createZipTask(
      isMV3 ? 'dist/**' : 'dist-mv2/**',
      `Rabby_v${version}${isDebug ? '_debug' : ''}.zip`
    );
  });
}

bundle().then(release).then(packed);
