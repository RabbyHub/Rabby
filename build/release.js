const path = require('path');
const { prompt, BooleanPrompt } = require('enquirer');
const fs = require('fs-extra');
const shell = require('shelljs');
const pkg = require('../package.json');
const { createConsistentZip, get_md5_file } = require('../scripts/fns');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const NO_BUILD=process.env.NO_BUILD;
const NO_PACK=process.env.NO_PACK;

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

async function release({ version, isRelease = false }) {
  if (isRelease) {
    shell.exec(`npm version ${version} --force`);
    shell.exec('git add -A');
    shell.exec(`git commit -m "[release] ${version}"`);
    shell.exec(`git push origin refs/tags/v${version}`);
    shell.exec('git push origin master');
  }
}

async function parse_git_info() {
  const gitCommittish = shell.exec('git rev-parse HEAD', { silent: true }).stdout;
  const gitUTC0Time = shell.exec('TZ=UTC0 git show --quiet --date="format-local:%Y-%m-%dT%H:%M:%S+00:00" --format="%cd"', { silent: true }).stdout;

  return {
    gitCommittish,
    gitUTC0Time,
  }
}

async function bundle() {
  const { gitCommittish, gitUTC0Time } = await parse_git_info();

  const cmd_prefix=`[Rabby::${gitCommittish.slice(0, 7)}]`

  const oldVersion = pkg.version;
  const plus1Version = oldVersion
    .split('.')
    .map((v, i) => (i === 2 ? +v + 1 : v))
    .join('.');
  const { version } = await prompt({
    type: 'input',
    name: 'version',
    message: `${cmd_prefix} Please input the release version:`,
    initial: plus1Version,
  });

  const isMV3 = await new BooleanPrompt({
    message: `${cmd_prefix} Do you want to release to MV3? (y/N)`,
    initial: 'y',
  }).run();

  const isDebug = await new BooleanPrompt({
    message: `${cmd_prefix} Do you want to build a debug version? (y/N)`,
    initial: 'N',
  }).run();

  const isRelease = await new BooleanPrompt({
    message: `${cmd_prefix} Do you want to create tag & push to remote? (y/N)`,
    initial: 'N',
  }).run();

  const buildStr = isDebug ? 'build:debug' : 'build:pro';

  updateManifestVersion(version, 'mv3');
  updateManifestVersion(version, 'mv2');

  if (isRelease) {
    await release({ version, isDebug, isRelease });
  }

  // shell.env['sourcemap'] = true;
  if (NO_BUILD !== 'true') {
    if (isMV3) {
      shell.exec(`cross-env VERSION=${version} yarn ${buildStr}`);
    } else {
      shell.exec(`cross-env VERSION=${version} yarn ${buildStr}:mv2`);
    }
  }
  shell.rm('-rf', './dist/*.js.map');

  do_package: {
    const hashed_zip = path.resolve(PROJECT_ROOT, `tmp/Rabby_v${version}${isDebug ? '_debug' : ''}.${gitCommittish.slice(0, 7)}.zip`);
    const package_for_release = path.resolve(PROJECT_ROOT, `Rabby_v${version}${isDebug ? '_debug' : ''}.zip`);
    await createConsistentZip(
      path.resolve(PROJECT_ROOT, 'dist'),
      hashed_zip,
      gitUTC0Time,
      { silent: false, printFileTable: false }
    );

    shell.exec(`cp ${hashed_zip} ${package_for_release}`);

    console.log(`${cmd_prefix} md5 of ${package_for_release}: ${await get_md5_file(package_for_release)}`);
  }
}

bundle();
