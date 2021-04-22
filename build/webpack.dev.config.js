const webpack = require('webpack');

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
      BUILD_ENV: JSON.stringify('DEV'),
    }),
  ],
};

module.exports = config;
