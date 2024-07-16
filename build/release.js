const path = require('path');
const { prompt, BooleanPrompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');
const pkg = require('../package.json');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function updateManifestVersion(version, p) {
  const manifestPath = path.resolve(
    PROJECT_ROOT,
    'src/manifest',
    p,
    'manifest.json'
  );
  const manifest = fs.readJSONSync(manifestPath);
  manifest.version = version;
  fs.writeJSONSync(manifestPath, manifest, { spaces: 2 });
}

async function release([version, isDebug, isRelease]) {
  if (isRelease) {
    shell.exec(`npm version ${version} --force`);
    shell.exec('git add -A');
    shell.exec(`git commit -m "[release] ${version}"`);
    shell.exec(`git push origin refs/tags/v${version}`);
    shell.exec('git push origin master');
  }
  return [version, isDebug, isRelease];
}

async function bundle() {
  const oldVersion = pkg.version;
  const plus1Version = oldVersion
    .split('.')
    .map((v, i) => (i === 2 ? +v + 1 : v))
    .join('.');
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

  const buildStr = isDebug ? 'build:debug' : 'build:pro';

  updateManifestVersion(version, 'mv3');
  updateManifestVersion(version, 'mv2');
  shell.env['sourcemap'] = true;
  if (isMV3) {
    shell.exec(`cross-env VERSION=${version} yarn ${buildStr}`);
  } else {
    shell.exec(`cross-env VERSION=${version} yarn ${buildStr}:mv2`);
  }
  shell.rm('-rf', './dist/*.js.map');
  return [version, isDebug, isRelease];
}
async function packed([version, isDebug]) {
  import('./zip.mjs').then((re) => {
    re.createZipTask(
      'dist/**',
      `Rabby_v${version}${isDebug ? '_debug' : ''}.zip`
    );
  });
}

bundle().then(release).then(packed);
