const webpack = require('webpack');

const config = {
  mode: 'production',
  devtool: false,
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    })
  ],
};

module.exports = config;
