const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const paths = require('./paths');

// for popup test
const config = {
  mode: 'development',
  devtool: 'eval-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.popupHtml,
      chunks: ['popup'],
      filename: 'index.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      BUILD_ENV: JSON.stringify('START'),
    }),
    new webpack.ProvidePlugin({
      langLocales: paths.rootResolve('src/_raw/_locales/en/messages.json'),
    }),
  ],
  devServer: {
    hot: true,
    port: 9000,
    historyApiFallback: true,
    open: true,
    openPage: 'popup.html',
  },
};

module.exports = config;
