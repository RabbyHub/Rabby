const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const SecSDK = require('warden-for-js').WardenPlugin;
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

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
    false &&
      new SecSDK({
        dev: false,
        disableProtoAssets: ['pageProvider.js'],
        skipScuttleAssets: ['pageProvider.js'],
        scuttle: true,
        monkeyPatchGlobals: [{ expr: 'this._targetWindow' }],
        scuttleFiles: [
          'desktop.html',
          'index.html',
          'offscreen.html',
          'popup.html',
          'notification.html',
          'background.html',
          'vendor/bitbox02/bitbox02-pairing.html',
          'sw.js',
        ],
        scuttleKeepProps: [
          'OffscreenCanvas',
          'Reflect',
          '__ru1n_qiuwen_scuttle_options__',
          'getComputedStyle',
          'Document',
          'HTMLElement',
          'SVGElement',
          'TouchEvent',
          'KeyboardEvent',
        ],
      }),
  ].filter(Boolean),

  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            pure_funcs: ['console.log', 'console.debug', 'console.info'],
          },
        },
      }),
    ],
  },
};

module.exports = config;
