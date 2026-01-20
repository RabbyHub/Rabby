const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const path = require('path');
const isHot = process.env.HOT === 'true';

// for extension local test, can build each time
const config = {
  mode: 'development',
  devtool: 'inline-cheap-module-source-map',
  watch: !isHot,
  watchOptions: {
    ignored: ['**/public', '**/node_modules'],
    followSymlinks: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('DEV'),
      'process.env.DEBUG': true,
    }),
    isHot && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
  devServer: {
    port: 3173,
    hot: true,
    static: {
      directory: path.join(__dirname, 'dist'),
    },

    devMiddleware: {
      writeToDisk: true,
    },

    client: {
      overlay: false,
      webSocketURL: {
        hostname: 'localhost',
        pathname: '/ws',
        port: 3173,
        protocol: 'ws',
      },
    },

    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
  },
};

module.exports = config;
