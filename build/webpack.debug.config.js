const webpack = require('webpack');
const path = require('path');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const SecSDK = require('supplychain_security_sdk').default;

const useSecSDK = !!process.env.useSecSDK || false;

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
    useSecSDK &&
      new SecSDK({
        disableProtoAssets: ['pageProvider.js'],
      }),
  ].filter(Boolean),
};

module.exports = config;