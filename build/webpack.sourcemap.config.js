const webpack = require('webpack');
const { createSentryWebpackPlugin } = require('./sentry');

const config = {
  mode: 'production',
  devtool: 'hidden-source-map',
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
    createSentryWebpackPlugin('sourcemap'),
  ],
};

module.exports = config;
