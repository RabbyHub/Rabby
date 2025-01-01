const webpack = require('webpack');
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const config = {
  mode: 'production',
  devtool: 'hidden-source-map',
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
    sentryWebpackPlugin({
      include: './dist',
      ignoreFile: '.sentrycliignore',
      ignore: ['node_modules', 'webpack.config.js'],
      configFile: 'sentry.properties',
      release: {
        name: process.env.VERSION
      },
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
};

module.exports = config;
