// dev:hot 开发服务器的端口，默认 3173。同时跑多个 dev:hot（比如每个 worktree
// 一个）时用 DEV_PORT 指定不同端口：DEV_PORT=3174 yarn dev:hot
// 扩展页的地址是 chrome-extension://，HMR 客户端没法从中推出端口，所以 ui 包里
// 的 HMR 入口也在构建时写入这个端口。
const DEFAULT_PORT = 3173;

const value = process.env.DEV_PORT;
const port = value ? Number(value) : DEFAULT_PORT;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`DEV_PORT 需要是 1-65535 之间的端口号，当前是 "${value}"`);
}

module.exports = port;
