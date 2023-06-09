const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const tsImportPluginFactory = require('ts-import-plugin');
const AssetReplacePlugin = require('./plugins/AssetReplacePlugin');
const { version } = require('../_raw/manifest.json');
const path = require('path');

const createStyledComponentsTransformer = require('typescript-plugin-styled-components')
  .default;

const isEnvDevelopment = process.env.NODE_ENV !== 'production';

const paths = require('./paths');

const config = {
  entry: {
    background: paths.rootResolve('src/background/index.ts'),
    'content-script': paths.rootResolve('src/content-script/index.ts'),
    pageProvider: paths.rootResolve(
      'node_modules/@rabby-wallet/page-provider/dist/index.js'
    ),
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
        oneOf: [
          {
            // prevent webpack remove this file's output even it's not been used in entry
            sideEffects: true,
            test: /[\\/]pageProvider[\\/]index.ts/,
            loader: 'ts-loader',
          },
          {
            test: /[\\/]ui[\\/]index.tsx/,
            use: [
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                  getCustomTransformers: () => ({
                    before: [
                      tsImportPluginFactory({
                        libraryName: 'antd',
                        libraryDirectory: 'lib',
                        style: true,
                      }),
                    ],
                  }),
                  compilerOptions: {
                    module: 'es2015',
                  },
                },
              },
              {
                loader: paths.rootResolve(
                  'node_modules/antd-dayjs-webpack-plugin/src/init-loader'
                ),
                options: {
                  plugins: [
                    'isSameOrBefore',
                    'isSameOrAfter',
                    'advancedFormat',
                    'customParseFormat',
                    'weekday',
                    'weekYear',
                    'weekOfYear',
                    'isMoment',
                    'localeData',
                    'localizedFormat',
                  ],
                },
              },
            ],
          },
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers: () => ({
                before: [
                  // @see https://github.com/Igorbek/typescript-plugin-styled-components#ts-loader
                  createStyledComponentsTransformer({
                    ssr: true, // always enable it to make all styled generated component has id.
                    displayName: isEnvDevelopment,
                    minify: false, // it's still an experimental feature
                    componentIdPrefix: 'rabby-',
                  }),
                ],
              }),
            },
          },
        ],
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
          {
            loader: 'style-resources-loader',
            options: {
              patterns: [
                path.resolve(__dirname, '../src/ui/style/var.less'),
                path.resolve(__dirname, '../src/ui/style/mixin.less'),
              ],
              injector: 'append',
            },
          },
        ],
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
      {
        test: /\.svg$/,
        use: [
          '@svgr/webpack',
          {
            loader: 'url-loader',
            options: {
              limit: false,
              outputPath: 'generated/svgs',
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'generated/images',
        },
      },
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
    ],
  },
  plugins: [
    new ESLintWebpackPlugin({
      extensions: ['ts', 'tsx', 'js', 'jsx'],
    }),
    // new AntdDayjsWebpackPlugin(),
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
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.indexHtml,
      chunks: ['ui'],
      filename: 'index.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.backgroundHtml,
      chunks: ['background'],
      filename: 'background.html',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
      dayjs: 'dayjs',
    }),
    new AssetReplacePlugin({
      '#PAGEPROVIDER#': 'pageProvider',
    }),
    new webpack.DefinePlugin({
      'process.env.version': JSON.stringify(`version: ${version}`),
      'process.env.release': JSON.stringify(version),
    }),
  ],
  resolve: {
    alias: {
      moment: require.resolve('dayjs'),
      '@debank/common': require.resolve('@debank/common/dist/index-rabby'),
    },
    plugins: [new TSConfigPathsPlugin()],
    fallback: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
    },
    extensions: ['.js', 'jsx', '.ts', '.tsx'],
  },
  stats: 'minimal',
  optimization: {
    splitChunks: {
      cacheGroups: {
        'webextension-polyfill': {
          minSize: 0,
          test: /[\\/]node_modules[\\/]webextension-polyfill/,
          name: 'webextension-polyfill',
          chunks: 'all',
        },
      },
    },
  },
  experiments: {
    topLevelAwait: true,
  },
};

module.exports = config;
