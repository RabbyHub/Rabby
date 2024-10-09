const child_process = require('child_process');
const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const tsImportPluginFactory = require('ts-import-plugin');
// const AssetReplacePlugin = require('./plugins/AssetReplacePlugin');
const CopyPlugin = require('copy-webpack-plugin');

const createStyledComponentsTransformer = require('typescript-plugin-styled-components')
  .default;

const isEnvDevelopment = process.env.NODE_ENV !== 'production';

const paths = require('./paths');

const BUILD_GIT_HASH = child_process
  .execSync('git log --format="%h" -n 1')
  .toString()
  .trim();

const {
  transformer: tsStyledComponentTransformer,
  webpackPlugin: tsStyledComponentPlugin,
} = createStyledComponentsTransformer({
  ssr: true, // always enable it to make all styled generated component has id.
  displayName: isEnvDevelopment,
  minify: false, // it's still an experimental feature
  componentIdPrefix: 'rabby-',
});
// 'chrome-mv2', 'chrome-mv3', 'firefox-mv2', 'firefox-mv3'
const MANIFEST_TYPE = process.env.MANIFEST_TYPE || 'mv2';
const IS_MANIFEST_MV3 = MANIFEST_TYPE.includes('-mv3');
const FINAL_DIST = IS_MANIFEST_MV3 ? paths.dist : paths.distMv2;

const config = {
  entry: {
    background: paths.rootResolve('src/background/index.ts'),
    'content-script': paths.rootResolve('src/content-script/index.ts'),
    pageProvider: paths.rootResolve(
      'node_modules/@rabby-wallet/page-provider/dist/index.js'
    ),
    ui: paths.rootResolve('src/ui/index.tsx'),
    offscreen: paths.rootResolve('src/offscreen/scripts/offscreen.ts'),
  },
  output: {
    path: FINAL_DIST,
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
                  tsStyledComponentTransformer,
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
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.offscreenHtml,
      chunks: ['offscreen'],
      filename: 'offscreen.html',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
      dayjs: 'dayjs',
    }),
    new webpack.DefinePlugin({
      'process.env.version': JSON.stringify(`version: ${process.env.VERSION}`),
      'process.env.release': JSON.stringify(process.env.VERSION),
      'process.env.RABBY_BUILD_GIT_HASH': JSON.stringify(BUILD_GIT_HASH),
      'process.env.ETHERSCAN_KEY': JSON.stringify(process.env.ETHERSCAN_KEY),
    }),
    new CopyPlugin({
      patterns: [
        { from: paths.rootResolve('_raw'), to: FINAL_DIST },
        {
          from: paths.rootResolve(`src/manifest/${MANIFEST_TYPE}/manifest.json`),
          to: FINAL_DIST,
        },
        IS_MANIFEST_MV3
          ? {
              from: require.resolve(
                '@trezor/connect-webextension/build/content-script.js'
              ),
              to: path.resolve(
                FINAL_DIST, './vendor/trezor/trezor-content-script.js'
              ),
            }
          : {
              from: require.resolve(
                '@trezor/connect-web/lib/webextension/trezor-content-script.js'
              ),
              to: path.resolve(
                FINAL_DIST, './vendor/trezor/trezor-content-script.js'
              ),
            },
          IS_MANIFEST_MV3
          ? {
              from: require.resolve(
                '@trezor/connect-webextension/build/trezor-connect-webextension.js'
              ),
              to: path.resolve(
                FINAL_DIST, './vendor/trezor/trezor-connect-webextension.js'
              ),
            }
          : {
              from: require.resolve(
                '@trezor/connect-web/lib/webextension/trezor-usb-permissions.js'
              ),
              to: path.resolve(
                FINAL_DIST, './vendor/trezor/trezor-usb-permissions.js'
              ),
            },
      ],
    }),
    tsStyledComponentPlugin,
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
      url: require.resolve('url'),
      zlib: require.resolve('browserify-zlib'),
      https: require.resolve('https-browserify'),
      http: require.resolve('stream-http'),
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
    asyncWebAssembly: true,
    topLevelAwait: true,
  },
};

module.exports = config;
