const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { createSentryWebpackPlugin } = require('./sentry');

const sentrySourceMap = !!process.env.sourcemap || false;
const SecSDK = require('supplychain_security_sdk').default;

const config = {
  mode: 'production',
  devtool: sentrySourceMap ? 'hidden-source-map' : false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
    sentrySourceMap && createSentryWebpackPlugin('pro'),
    false && new SecSDK({
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
        'KeyboardEvent'
      ],
    }),
  ].filter(Boolean),

  optimization: {
    minimize: true,
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
