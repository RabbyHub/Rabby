const webpack = require('webpack');
const path = require('path');
const fs = require('fs-extra');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const PROJECT_ROOT = path.resolve(__dirname, '..');
const manifestPath = path.resolve(PROJECT_ROOT, '_raw', 'manifest.json');
const manifest = fs.readJSONSync(manifestPath);

const config = {
  mode: 'production',
  devtool: false,
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
