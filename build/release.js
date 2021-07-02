const path = require('path');
const { prompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');
const zipdir = require('zip-dir');

const PROJECT_ROOT = path.resolve(__dirname, '..');

async function release() {
  const input = await prompt({
    type: 'input',
    name: 'version',
    message: '[Rabby] Please input the release version:'
  });
  const manifestPath = path.resolve(PROJECT_ROOT, '_raw', 'manifest.json');
  const manifest = fs.readJSONSync(manifestPath);
  manifest.version = input.version;
  fs.writeJSONSync(manifestPath, manifest, { spaces: 2 });
  shell.exec(`npm version ${input.version} --force`);
  shell.exec('git add -A');
  shell.exec(`git commit -m "[release] ${input.version}"`);
  shell.exec(`git push origin refs/tags/v${input.version}`);
  shell.exec('git push origin master');

  return input.version
}

function bundle(version) {
  shell.exec('yarn build:pro');
  const distPath = path.resolve(PROJECT_ROOT, 'dist');
  zipdir(distPath, { saveTo: `Rabby_v${version}.zip` });
}

release().then(bundle);