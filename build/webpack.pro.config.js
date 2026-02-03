const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

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
    sentrySourceMap &&
      sentryWebpackPlugin({
        include: './dist',
        ignoreFile: '.sentrycliignore',
        ignore: ['node_modules', 'webpack.config.js'],
        configFile: 'sentry.properties',
        release: {
          name: process.env.VERSION,
        },
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,

        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ,
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
            pure_funcs: ['console.log', 'console.debug'],
          },
        },
      }),
    ],
  },
};

module.exports = config;
