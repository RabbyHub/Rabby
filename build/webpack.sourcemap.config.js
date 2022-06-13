const webpack = require('webpack');
const path = require('path');
const fs = require('fs-extra');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const SentryCliPlugin = require('@sentry/webpack-plugin');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const manifestPath = path.resolve(PROJECT_ROOT, '_raw', 'manifest.json');
const manifest = fs.readJSONSync(manifestPath);

const config = {
  mode: 'production',
  devtool: 'sourcemap',
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
    new SentryCliPlugin({
      include: './dist',
      ignoreFile: '.sentrycliignore',
      ignore: ['node_modules', 'webpack.config.js'],
      configFile: 'sentry.properties',
      release: manifest.version,
    }),
  ],
};

module.exports = config;
