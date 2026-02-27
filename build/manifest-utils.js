const fs = require('fs');
const path = require('path');

const DEFAULT_MANIFEST_FILENAME = 'manifest.json';
const DEV_MANIFEST_FILENAME = 'manifest.dev.json';
const LOCAL_MANIFEST_FILENAME = 'manifest.local.json';
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

const hasLocalManifest = (manifestType) =>
  fs.existsSync(
    path.resolve(
      __dirname,
      `../src/manifest/${manifestType}/${LOCAL_MANIFEST_FILENAME}`
    )
  );

const resolveManifestFilename = ({ manifestType, buildEnv }) =>
  shouldUseDevManifest({ manifestType, buildEnv })
    ? hasLocalManifest(manifestType)
      ? LOCAL_MANIFEST_FILENAME
      : DEV_MANIFEST_FILENAME
    : DEFAULT_MANIFEST_FILENAME;

module.exports = {
  resolveManifestFilename,
};
