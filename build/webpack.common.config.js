const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

const paths = require('./paths');

const config = {
  entry: {
    background: paths.rootResolve('src/background/index.ts'),
    'content-script': paths.rootResolve('src/content-script/index.ts'),
    pageProvider: paths.rootResolve('src/content-script/pageProvider/index.tsx'),
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
        loader: 'ts-loader'
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
    ],
  },
  plugins: [
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
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    })
  ],
  resolve: {
    plugins: [new TSConfigPathsPlugin()],
    fallback: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
    },
    extensions: ['.js', 'jsx', '.ts', '.tsx']
  },
  stats: 'minimal',
};

module.exports = config;
