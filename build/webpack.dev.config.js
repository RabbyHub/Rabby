const webpack = require('webpack');
const SecSDK = require('supplychain_security_sdk').default;

const useSecSDK = !!process.env.useSecSDK || false;

// for extension local test, can build each time
const config = {
  mode: 'development',
  devtool: 'inline-cheap-module-source-map',
  watch: true,
  watchOptions: {
    ignored: ['**/public', '**/node_modules'],
    followSymlinks: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('DEV'),
      'process.env.DEBUG': true,
    }),

    useSecSDK &&
      new SecSDK({
        dev: true,
        disableProtoAssets: ['pageProvider.js'],
        skipScuttleAssets: ['pageProvider.js'],
        scuttle: true,
      }),
  ].filter(Boolean),
};

module.exports = config;
