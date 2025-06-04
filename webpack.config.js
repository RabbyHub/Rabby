const webpackMerge = require('webpack-merge');
const commonConfig = require('./build/webpack.common.config');

const configs = {
  dev: require('./build/webpack.dev.config'),
  pro: require('./build/webpack.pro.config'),
  debug: require('./build/webpack.debug.config'),
  sourcemap: require('./build/webpack.sourcemap.config'),
};

const config = (env) => {
  const baseConfig = {
    resolve: {
      alias: {
        'react/jsx-runtime': require.resolve('react/jsx-runtime')
      }
    }
  };

  if (env.config) {
    return webpackMerge.merge(commonConfig, configs[env.config], baseConfig);
  }

  return webpackMerge.merge(commonConfig, baseConfig);
};

module.exports = config;
