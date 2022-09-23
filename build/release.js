const path = require('path');
const { prompt, BooleanPrompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');
const zipdir = require('zip-dir');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function updateManifestVersion(version, path) {
  const manifestPath = path.resolve(
    PROJECT_ROOT,
    'src/manifest',
    path,
    'manifest.json'
  );
  const manifest = fs.readJSONSync(manifestPath);
  manifest.version = version;
  fs.writeJSONSync(manifestPath, manifest, { spaces: 2 });
}

async function release(version) {
  updateManifestVersion(version, 'mv3');
  updateManifestVersion(version, 'mv2');
  shell.exec(`npm version ${version} --force`);
  shell.exec('git add -A');
  shell.exec(`git commit -m "[release] ${version}"`);
  shell.exec(`git push origin refs/tags/v${version}`);
  shell.exec('git push origin master');
  return version;
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

  if (isMV3) {
    shell.exec(`VERSION=${version} yarn build:pro:mv3`);
  } else {
    shell.exec(`VERSION=${version} yarn build:pro`);
  }
  return version;
}

async function packed(version) {
  const distPath = path.resolve(PROJECT_ROOT, 'dist');
  return zipdir(distPath, { saveTo: `Rabby_v${version}.zip` });
}

bundle().then(release).then(packed);
