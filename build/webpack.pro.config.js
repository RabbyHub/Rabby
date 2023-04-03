const webpack = require('webpack');
const path = require('path');
const fs = require('fs-extra');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');
const SentryCliPlugin = require('@sentry/webpack-plugin');
const paths = require('./paths');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const manifestPath = process.env.ENABLE_MV3
  ? paths.rootResolve('src/manifest/mv3/manifest.json')
  : paths.rootResolve('src/manifest/mv2/manifest.json');
const manifest = fs.readJSONSync(manifestPath);

const sentrySourceMap = !!process.env.sourcemap || false;

const config = {
  mode: 'production',
  devtool: sentrySourceMap ? 'source-map' : false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
    sentrySourceMap &&
      new SentryCliPlugin({
        include: './dist',
        ignoreFile: '.sentrycliignore',
        ignore: ['node_modules', 'webpack.config.js'],
        configFile: 'sentry.properties',
        release: manifest.version,
      }),
  ].filter(Boolean),

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            pure_funcs: ['console.log', 'console.debug'],
          },
        },
      }),
    ],
  },
};

module.exports = config;
