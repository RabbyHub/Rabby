const webpack = require('webpack');

// for extension local test, can build each time
const config = {
  mode: 'development',
  // separate .map files: inline maps roughly double every bundle in memory
  devtool: 'cheap-module-source-map',
  output: {
    pathinfo: false,
  },
  watch: true,
  watchOptions: {
    ignored: [
      '**/public',
      '**/node_modules',
      '**/dist/**',
      '**/dist-mv2/**',
      '**/tmp/**',
    ],
    followSymlinks: false,
    // native file events by default; set WEBPACK_POLL=1000 where they don't
    // arrive (network drives, some VMs)
    ...(process.env.WEBPACK_POLL && {
      poll: Number(process.env.WEBPACK_POLL),
    }),
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.BUILD_ENV': JSON.stringify('DEV'),
      'process.env.DEBUG': true,
    }),
  ],
};

module.exports = config;
