const webpack = require('webpack');
const path = require('path');
const SecSDK = require('warden-for-js').WardenPlugin;

const config = {
  mode: 'production',
  devtool: false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
      'process.env.DEBUG': true,
    }),
    true &&
      new SecSDK({
        dev: false,
        forceCheck: false,
      }),
  ].filter(Boolean),
};

module.exports = config;
