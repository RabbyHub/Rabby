const webpack = require('webpack');
const path = require('path');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const SecSDK = require('supplychain_security_sdk').default;

const config = {
  mode: 'production',
  devtool: false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
      'process.env.DEBUG': true,
    }),
    new SecSDK({
      dev: false,
      disableProtoAssets: ['pageProvider.js'],
      skipScuttleAssets: ['pageProvider.js'],
      scuttle: true,
      monkeyPatchGlobals: [{ expr: 'this._targetWindow' }],
      scuttleFiles: [
        "desktop.html",
        "index.html",
        "offscreen.html",
        "popup.html",
        "notification.html",
        "background.html",
        "vendor/bitbox02/bitbox02-pairing.html",
        "sw.js"
      ]
    }),
  ],
  
};

module.exports = config;
