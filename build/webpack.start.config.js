const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const paths = require('./paths');

// for popup test
const config = {
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.popupHtml,
      chunks: ['popup'],
      filename: 'index.html',
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    hot: true,
    port: 9000,
    historyApiFallback: true,
  },
  devtool: 'eval-source-map',
  mode: 'development',
}

module.exports = config;
