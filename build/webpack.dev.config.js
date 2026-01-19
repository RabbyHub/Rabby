const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const path = require('path');

// for extension local test, can build each time
const config = {
  mode: 'development',
  devtool: 'inline-cheap-module-source-map',
  // watch: true,
  watchOptions: {
    ignored: ['**/public', '**/node_modules'],
    followSymlinks: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('DEV'),
      'process.env.DEBUG': true,
    }),
    new ReactRefreshWebpackPlugin({
      include: /src\/ui\/index\.tsx/,
      exclude: [/background/, /content-script/, /page-provider/, /offscreen/],
    }),
  ],
  devServer: {
    port: 3000,
    hot: true, // 开启热更新
    static: {
      directory: path.join(__dirname, 'dist'),
    },

    // 【重点 1】writeToDisk 必须包裹在 devMiddleware 中
    devMiddleware: {
      writeToDisk: true,
    },

    // 【重点 2】解决连接报错
    client: {
      overlay: false, // 禁止在扩展页面显示全屏报错
      webSocketURL: {
        hostname: 'localhost',
        pathname: '/ws',
        port: 3000,
        protocol: 'ws',
      },
    },

    // 【重点 3】跨域头
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
  },
};

module.exports = config;
