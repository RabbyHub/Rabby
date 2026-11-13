const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const path = require('path');

async function startDevServer() {
  // 获取 webpack 配置
  const config = await require('./webpack.hot.config.js');

  const app = express();
  const port = require('./dev-port');

  // 只对 uiConfig 启用热更新
  const uiConfig = Array.isArray(config)
    ? config.find((c) => c.name === 'ui')
    : config;

  if (!uiConfig) {
    console.error('找不到 UI 配置');
    process.exit(1);
  }

  // 创建 webpack 编译器
  const compiler = webpack(config);

  // 配置 webpack-dev-middleware
  const devMiddleware = webpackDevMiddleware(compiler, {
    publicPath: uiConfig.output.publicPath,
    stats: 'minimal',
    writeToDisk: true, // 写入磁盘，浏览器扩展需要读取文件
  });

  // 配置 webpack-hot-middleware（只对 ui 编译器）
  const uiCompiler = compiler.compilers
    ? compiler.compilers.find((c) => c.name === 'ui')
    : compiler;
  const hotMiddleware = webpackHotMiddleware(uiCompiler, {
    path: '/__webpack_hmr',
    log: false,
    heartbeat: 2000,
  });

  // 设置 CORS 头（必须在其他中间件之前）
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-Requested-With, content-type, Authorization'
    );
    next();
  });

  // 使用中间件
  app.use(devMiddleware);
  app.use(hotMiddleware);

  // 提供静态文件
  const distPath = uiConfig.output.path;
  app.use(express.static(distPath));

  // 启动服务器
  devMiddleware.waitUntilValid(() => {
    console.log(`\n开发服务器运行在 http://localhost:${port}`);
    console.log('等待 Webpack 编译完成...\n');
  });

  app.listen(port, 'localhost', (err) => {
    if (err) {
      // 不能只打日志继续跑：webpack 还会照常构建，而 ui 包里的 HMR 客户端会连上
      // 占用这个端口的另一个 dev:hot，收到别人的更新就整页刷新
      if (err.code === 'EADDRINUSE') {
        console.error(
          `\n端口 ${port} 已被占用，可能已有一个 dev:hot 在运行。` +
            `同时跑多个时用 DEV_PORT 指定其他端口，例如：DEV_PORT=${
              port + 1
            } yarn dev:hot\n`
        );
      } else {
        console.error(err);
      }
      process.exit(1);
    }
    console.log(`服务器正在监听端口 ${port}...\n`);
  });
}

startDevServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
