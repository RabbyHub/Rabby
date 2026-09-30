const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
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
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        parallel: 1,
        terserOptions: {
          compress: {
            passes: 2,
          },
        },
      }),
    ],
  },
};

module.exports = config;
