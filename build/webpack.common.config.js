const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const paths = require('./paths');
const { compilerOptions: { baseUrl } } = require('../jsconfig.json');

const config = {
  entry: {
    background: paths.rootResolve('src/background/index.js'),
    'content-script': paths.rootResolve('src/content-script/index.js'),
    provider: paths.rootResolve('src/content-script/provider.js'),
    popup: paths.rootResolve('src/popup/index.js'),
    notification: paths.rootResolve('src/notification/index.js'),
  },
  output: {
    path: paths.dist,
    filename: '[name].js',
    publicPath: '/',
  },
  mode: 'production',
  devtool: false,
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
    }, {
      test: /\.css$/,
      use: [{
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1,
        }
      },
      {
        loader: 'postcss-loader'
      }]
    }],
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.popupHtml,
      chunks: ['popup'],
      filename: 'popup.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.notificationHtml,
      chunks: ['notification'],
      filename: 'notification.html',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
    // new BundleAnalyzerPlugin(),
  ],
  resolve: {
    modules: ['node_modules', baseUrl],
    fallback: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
    },
  },
  stats: 'minimal',
};

module.exports = config;
