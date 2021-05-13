const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');

const paths = require('./paths');

const config = {
  entry: {
    background: paths.rootResolve('src/background/index.ts'),
    'content-script': paths.rootResolve('src/content-script/index.ts'),
    pageProvider: paths.rootResolve('src/content-script/pageProvider/index.ts'),
    ui: paths.rootResolve('src/ui/index.tsx'),
  },
  output: {
    path: paths.dist,
    filename: '[name].js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$|\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
          },
        ],
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader']
      }
    ],
  },
  plugins: [
    new ESLintWebpackPlugin({
      extensions: ['ts', 'tsx', 'js', 'jsx'],
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.popupHtml,
      chunks: ['ui'],
      filename: 'popup.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.notificationHtml,
      chunks: ['ui'],
      filename: 'notification.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.indexHtml,
      chunks: ['ui'],
      filename: 'index.html',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
  ],
  resolve: {
    plugins: [new TSConfigPathsPlugin()],
    fallback: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
    },
    extensions: ['.js', 'jsx', '.ts', '.tsx'],
  },
  stats: 'minimal',
  optimization: {
    splitChunks: {
      cacheGroups: {
        'webextension-polyfill': {
          minSize: 0,
          test: /[\\/]node_modules[\\/]webextension-polyfill/,
          name: 'webextension-polyfill',
          chunks: 'all',
        },
      },
    },
  },
};

module.exports = config;
