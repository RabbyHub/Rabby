# Tempo multi_actions 安全门禁手工验证

使用当前工作区修复后的扩展构建，并在浏览器扩展管理页重新加载。选择专用的普通助记词/私钥测试账户，使用 Rabby 内建 Tempo 主网（4217 / 0x1079）。测试网走 SignTestnetTx，不覆盖本次修复；硬件或观察账户还可能触发账户能力限制。

这些样例调用 eth_sendTransaction，会打开真实审批，最终确认可能广播。只检查风险、确认风险项的处理行为，最后取消交易。不要点最终签名/发送。每笔都取消后再开下一笔。测试账户保留少量 pathUSD 作为手续费，避免 Gas 不足遮住安全门禁；transfer 样例还需要至少 2 个代币最小单位。

## 使用方法

1. 在能注入 Rabby 的普通 HTTP(S) 页面打开开发者工具 Console（不是扩展的后台 Console，也不是浏览器新标签页）。优先用自己的本地测试页面。
2. 复制同目录 tempo-security-cases.js 的全部内容到 Console 执行。此操作仅安装辅助函数，没有钱包请求。
3. 执行 `await tempoGate.connect()`，选择测试账户，切换到 Tempo 主网。
4. 逐笔执行下面的命令。`await tempoGate.preview('double')` 可只打印请求，不打开审批。

所有 approve/transfer 的数量都是 1 个最小单位，即 0.000001 pathUSD，均非无限授权。

## 样例和通过标准

| 用例 | 命令及前置状态 | 必须看到的结果 |
| --- | --- | --- |
| 单动作对照 | `await tempoGate.open('single')`；A 无标记 | 对 A 的授权出现“授权地址是 EOA”风险（1022），未处理风险不能签名。 |
| 两个动作命中同一条规则 | `await tempoGate.open('double')`；A、B 均无标记 | 两个独立授权，各自命中 1022。只处理第一项的风险后，第二项仍须拦截。不要用页脚全局 Ignore All 来测试逐项隔离。 |
| SAFE + DANGER | 再打开 `double`，只将 A 标为 Trusted，B 保持无标记 | A 出现 Trusted/1133 SAFE，B 仍有 1022 DANGER；整体仍须拦截，不能被 A 的 SAFE 抵消。改标记期间也不能短暂放行。 |
| FORBIDDEN | 打开 `double`，A 可保持 Trusted，将 B 标为 Blocked | B 出现 Blocked/1134 FORBIDDEN，未处理时不能签名。A 的 SAFE 不能抵消 B。测试的是风险必须被处理，并非要求永久无法忽略。 |
| 原报告的转账风险类型 | `await tempoGate.open('transfers')` | 向 pathUSD 和 USDC.e 两个代币合约各转 1 最小单位。解析为两个 send_token；在上下文确认接收方为代币合约时命中 1016。风险未处理不能签名。若预执行失败，不可仅凭灰色按钮判定本项通过。 |

A = `0x000000000000000000000000000000000000dead`

B = `0x000000000000000000000000000000000000beef`

修改标记：点击对应子动作“授权给 / Approve to”的地址 → 地址详情底部“我的标记 / My mark” → “无标记 / No mark”或铅笔 → “信任 / Trusted”或“禁止 / Blocked”。点击选项立即保存。标记会持久化，取消交易不会撤销；做完后在同一入口把 A、B 恢复为“无标记”。不要关闭 1022 等风险规则来代替逐项确认。

第一笔若没有显示 1022，先检查该规则是否开启，以及 A 是否已经被信任；前置对照不成立时，后续样例无法验证目标问题。

## 补充回归

- 在 `double` 中逐项处理全部待处理风险，安全引擎造成的门禁应解除；停在最终签名前并取消。这是正向对照，防止“永远禁用按钮”被误判为修复成功。
- 取消后再次打开 `double`，上一次的 Ignore/确认不应沿用到新审批。Trusted/Blocked 是持久设置，行为不同。
- 加载中或风险计算失败时，不能提前签名。观察安全引擎加载/失败提示；不要把余额不足、Gas 错误或预执行失败当作风险门禁通过的证据。
- 若有合适的调试工具，在扩展请求链路查看 `/v1/engine/action/parse_tx` 响应：批量用例应为 `action.type === 'multi_actions'`，`action.data.length === 2`。普通页面的 Network 通常看不到扩展后台请求。

## 已验证的证据与范围

2026-09-08 使用虚构 sender 和上述 calldata 请求 Rabby 公开解析接口，单笔返回 approve_token；双授权返回 multi_actions + 两个 approve_token；双转账返回 multi_actions + 两个 send_token。另查询 `/v1/contract?chain_id=tempo&id=...`，A、B 均返回 contract:null，符合当前 1022 规则的 EOA 判断。未请求签名或广播，也未完成浏览器端端到端验证。

这些用例覆盖 SignTx。SignTypedData/Permit2 批量签名及硬件钱包延迟签名路径仍需独立回归，不能由这些交易推断全部通过。

2026-09-09 范围复核：全局锁钱包清理审批属于独立的既有会话边界问题，已从本次 multi_actions 补丁分离，因此本清单不再把锁钱包行为作为本补丁已修复的项目。

参考：[Tempo 原生 calls 批量交易](https://docs.tempo.xyz/guide/use-accounts/batch-transactions)、[pathUSD 地址和 6 位精度](https://docs.tempo.xyz/protocol/exchange/pathUSD)。
