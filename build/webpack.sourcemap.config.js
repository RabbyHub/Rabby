const webpack = require('webpack');

const config = {
  mode: 'production',
  devtool: 'hidden-source-map',
  performance: {
    maxEntrypointSize: 2500000,
    maxAssetSize: 2500000,
  },
  plugins: [
    new webpack.SourceMapDevToolPlugin(),
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('PRO'),
    }),
  ],
};

module.exports = config;
