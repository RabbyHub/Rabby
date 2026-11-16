const webpack = require('webpack');
const { WardenPlugin } = require('warden-for-js');

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
    new WardenPlugin({
      dev: false,
      forceCheck: true,
      freezePrototypes: true,
      prototypeFreezeMode: 'compat',
      protectWebpackRequire: true,
    }),
  ].filter(Boolean),
};

module.exports = config;
