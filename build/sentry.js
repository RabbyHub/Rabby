const path = require('path');

const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

const { resolveManifestVersion } = require('./manifest-utils');
const paths = require('./paths');

const getManifestType = () => process.env.MANIFEST_TYPE || 'chrome-mv2';

const getSentryOutputPath = () =>
  getManifestType().includes('-mv3') ? paths.dist : paths.distMv2;

const getSentryRelease = (buildEnv) =>
  process.env.VERSION ||
  resolveManifestVersion({
    manifestType: getManifestType(),
    buildEnv,
  });

const createSentryWebpackPlugin = (buildEnv) => {
  const outputPath = getSentryOutputPath();

  return sentryWebpackPlugin({
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    telemetry: false,
    release: {
      name: getSentryRelease(buildEnv),
    },
    sourcemaps: {
      assets: path.join(outputPath, '**/*.{js,map}'),
      filesToDeleteAfterUpload: path.join(outputPath, '**/*.map'),
    },
  });
};

module.exports = {
  createSentryWebpackPlugin,
  getSentryRelease,
};
