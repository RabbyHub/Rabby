const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const sentrySourceMap = !!process.env.sourcemap || false;
const SecSDK = require('warden-for-js').WardenPlugin;
// Terser workers are threads inside the webpack process, so each one adds its
// own copy of the asset it minifies to the build's memory. Memory-limited CI
// runners lower this via TERSER_PARALLEL; unset keeps Terser's default.
const terserParallel = process.env.TERSER_PARALLEL
  ? Number(process.env.TERSER_PARALLEL)
  : true;

const config = {
  mode: 'production',
  devtool: sentrySourceMap ? 'hidden-source-map' : false,
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
    true &&
      new SecSDK({
        dev: false,
      }),
  ].filter(Boolean),

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: terserParallel,
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
