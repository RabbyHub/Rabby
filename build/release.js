const path = require('path');
const { prompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');

async function release() {
  const input = await prompt({
    type: 'input',
    name: 'version',
    message: '[Rabby] Please input the release version:'
  });
  const manifestPath = path.resolve(__dirname, '..', '_raw', 'manifest.json');
  const manifest = fs.readJSONSync(manifestPath);
  manifest.version = input.version;
  fs.writeJSONSync(manifestPath, manifest, { spaces: 2 });
  shell.exec(`npm version ${input.version} --force`);
  shell.exec('git add -A');
  shell.exec(`git commit -m [release] ${input.version}`);
  shell.exec(`git push origin refs/tags/v${input.version}`);
  shell.exec('git push origin master');
}

release();