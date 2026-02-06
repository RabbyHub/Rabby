const DEFAULT_MANIFEST_FILENAME = 'manifest.json';
const DEV_MANIFEST_FILENAME = 'manifest.dev.json';
const PRODUCTION_BUILD_ENVS = new Set(['pro']);

const isProductionBuild = (buildEnv) =>
  PRODUCTION_BUILD_ENVS.has(buildEnv || '');

const shouldUseDevManifest = ({ manifestType, buildEnv }) => {
  if (manifestType !== 'chrome-mv3') {
    return false;
  }

  if (isProductionBuild(buildEnv)) {
    return false;
  }

  return true;
};

const resolveManifestFilename = ({ manifestType, buildEnv }) =>
  shouldUseDevManifest({ manifestType, buildEnv })
    ? DEV_MANIFEST_FILENAME
    : DEFAULT_MANIFEST_FILENAME;

module.exports = {
  resolveManifestFilename,
};
