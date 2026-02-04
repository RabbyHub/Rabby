const webpackMerge = require('webpack-merge');

const configs = {
  dev: require('./build/webpack.dev.config'),
  pro: require('./build/webpack.pro.config'),
  debug: require('./build/webpack.debug.config'),
  sourcemap: require('./build/webpack.sourcemap.config'),
};

const config = (env = {}) => {
  if (env.config) {
    process.env.RABBY_BUILD_ENV = env.config;
    const commonConfig = require('./build/webpack.common.config');
    return webpackMerge.merge(commonConfig, configs[env.config]);
  }

  const commonConfig = require('./build/webpack.common.config');
  return commonConfig;
};

module.exports = config;
