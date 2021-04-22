const webpack = require('webpack');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;

const config = {
  mode: 'production',
  devtool: false,
  plugins: [
    new webpack.DefinePlugin({
      BUILD_ENV: JSON.stringify('PRO'),
    }),
    new BundleAnalyzerPlugin(),
  ],
};

module.exports = config;
