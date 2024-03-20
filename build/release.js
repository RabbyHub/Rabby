const path = require('path');
const { prompt, BooleanPrompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');
const zipdir = require('zip-dir');

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
  const { version } = await prompt({
    type: 'input',
    name: 'version',
    message: '[Rabby] Please input the release version:',
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
    shell.exec(`cross-env VERSION=${version} yarn ${buildStr}:mv3`);
  } else {
    shell.exec(`cross-env VERSION=${version} yarn ${buildStr}`);
  }
  shell.rm('-rf', './dist/*.js.map');
  return [version, isDebug, isRelease];
}

async function packed([version, isDebug]) {
  const distPath = path.resolve(PROJECT_ROOT, 'dist');
  return zipdir(distPath, {
    saveTo: `Rabby_v${version}${isDebug ? '_debug' : ''}.zip`,
  });
}

bundle().then(release).then(packed);
