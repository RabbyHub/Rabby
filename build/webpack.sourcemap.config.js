const webpack = require('webpack');
const SentryCliPlugin = require('@sentry/webpack-plugin');

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
      release: process.env.VERSION,
    }),
  ],
};

module.exports = config;
