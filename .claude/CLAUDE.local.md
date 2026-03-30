# TradingView 高级 K 线图表 - 开发指南 (彭光明)

## 工作背景

接手移交的高级 K 线图表功能。功能已初步实现，但存在多个问题待修复，可通过使用发现异常问题逐步处理。另外，需要参考币安的 K 线图表实现，确保功能和交互的一致性。由于 TradingView Charting Library 是一个私有库，无法直接 npm install，因此需要通过本地调试和文档查询来开发和调试功能。币安的 k 线图表参考网址：https://www.binance.com/zh-CN/futures/BTCUSDT

## 核心原则

1. **优先启用图表自身功能**，微调逻辑而非开发新功能
2. **尽量不修改 UI**
3. TradingView 官方文档（licensed 功能）

## 架构概览

```
Rabby (宿主) ←→ postMessage ←→ tradingview iframe (https://tradingview.rabby.io/)
     │                                    │
     │ Hyperliquid SDK                     │ TradingView Charting Library v31.0.0
     │ (K线数据源: REST + WebSocket)        │ (私有 GitHub 仓库，无法 npm install)
```

## 关键文件 (Rabby 侧)

- `src/ui/views/Perps/components/TradingViewIframeChart.tsx` — 核心：iframe 通信 + 数据处理（711 行）
  - postMessage bridge 协议：channel `rabby-tradingview-bridge-v1`
  - 消息类型：request / response / event / command
  - 本地调试：`localStorage.setItem('perps:tradingview:url', 'http://localhost:5173')`
- `src/ui/views/DesktopPerps/components/ChartArea/components/ChartWrapper.tsx` — Desktop 端图表包装器

## 已知问题

- 全屏作用域受限于 iframe
- 切换币种时未清理旧数据，导致图表数据跳动

## 数据流

1. iframe 发送 `getBars` / `resolveSymbol` 等请求 → postMessage → Rabby
2. Rabby 调用 Hyperliquid SDK 获取数据 → postMessage 返回 → iframe 渲染
3. 实时订阅：Rabby 通过 WebSocket 接收新 bar → `subscribeBars` event 推送给 iframe

## 本地调试

- tradingview 项目：`/Users/guangmingpeng/Desktop/workSpace/tradingview`
- 启动后设置 localStorage 指向本地地址即可联调

## 开发分工

| 改动类型                                           | 在哪个项目  |
| -------------------------------------------------- | ----------- |
| 数据获取/处理、bridge 协议、Rabby UI               | Rabby       |
| 图表配置/样式、TradingView API 调用、widget 初始化 | tradingview |

## MCP 工具

`query_tradingview_docs` — 通过 Gemini 查询 TradingView 官方文档（670K tokens），用于查阅 widget 配置、API、datafeed 接口等。

## 参考资料

- 币安截图与功能对照文档：`/Users/guangmingpeng/Desktop/workSpace/shared-references/`
  - `binance-screenshots/` — 币安图表关键区域截图
  - `binance-feature-spec.md` — 功能对照清单（由截图分析生成）
  - `todo-tradingview-alignment.md` — 基于币安对照清单的开发任务列表
