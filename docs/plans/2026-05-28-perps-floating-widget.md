# Perps 网页悬浮组件 — 技术框架与数据管线规划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在用户浏览任意网页时,通过 content-script 注入一个常驻悬浮球(显示 Perps 仓位 PnL 实时数字),hover 展开仓位概览,点击跳转 Pro 版 Tab。本 plan 仅覆盖**数据管线 + 注入容器骨架 + 配置存储**——UI 视觉/交互留待 UI 稿落地后追加专门的 plan。

**Architecture:**
- WebSocket 单例放在 **Service Worker** 内的 `perpsLive` service。Rabby 现有 [`offscreen.ts`](../../src/offscreen/scripts/offscreen.ts) 每 5 秒发一次 ping 把 SW 永久钉住,SW 不会休眠,WS 在 SW 内是稳定的
- 数据两跳通路:`Hyperliquid WS ⇄ Service Worker ⇄ Content-script`(不经 offscreen)
- 不引入 `chrome.sidePanel` API、不新增 sidepanel.html 入口、不扩 `web_accessible_resources`、**不动 offscreen 现状**(继续只负责硬件钱包桥接与 SW 续命)
- 点击进 Pro 版复用现有 `wallet.openInDesktop('/desktop/perps')` 基建,锁定状态走现有 Unlock 流程
- 仅在**顶层文档**注入,避开 iframe(manifest 当前 `all_frames: true`,需在 widget 引导处守卫)
- 球持续显示 PnL,无 unlock 也可见(只读公开链上数据,不碰 keyring);用户嫌烦从设置整体关闭

**Tech Stack:**
- 现有 Rabby Chrome MV3 扩展(webpack + React + redux + webextension-polyfill)
- Hyperliquid WS `wss://api.hyperliquid.xyz/ws`,`webData2` 订阅(账户全量推送,含仓位/PnL/订单/行情)
- `host_permissions: ["<all_urls>"]` 已就位,无需新增网络权限
- SW 中直接使用 `WebSocket` 构造器(SW 全局可用)

**Scope of this plan:**
- ✅ Manifest 审计、preferenceService 扩展、消息协议、SW perpsLive(含 WS 客户端)、content-script 数据通路、注入容器骨架、生命周期管理、自测验证路径、安全/QA 文档清单
- ❌ 任何 UI 视觉、Shadow DOM 布局、PnL 渲染样式、拖拽、hover 动画、设置页 UI、i18n —— 全部留待 UI 稿就绪后追加

---

## 背景与已对齐决策

1. **悬浮球 + hover 弹层 是 content-script 注入的纯 DOM**(closed Shadow DOM 隔离);不使用扩展页 iframe,不依赖 `web_accessible_resources`
2. **球持续显示 PnL 完整数字**,默认开启(用户配置过 Perps 账户即出现);用户从设置整体关闭悬浮组件
3. **点击 → 浏览器新 tab 打开 `desktop.html#/desktop/perps`**(Pro 版),走现有 [`wallet.openInDesktop`](../../src/background/controller/wallet.ts) 基建;锁定时落到 Unlock 页,解锁后自然到达 Perps
4. **WS 放 SW 即可**:Rabby SW 已被 offscreen 每 5s ping 永远保活([`offscreen.ts:13-19`](../../src/offscreen/scripts/offscreen.ts#L13-L19)),不会休眠;Hyperliquid WS 自带 30s ping/pong 维持服务端那侧的活性,与 SW 保活无关。**不扩展 offscreen,保持其只负责硬件钱包桥接与 SW 续命**
5. **多 tab broadcast 是必选**:球同时存在于 N 个 tab,绝不允许 N 条 WS;一条 SW WS → broadcast 到所有挂了球的 content-script

---

## 整体架构图

```
                                  ┌────────────────────────────┐
   Hyperliquid     ◄──WebSocket──►│  Service Worker            │
   (wss://api...)                 │  service/perpsLive.ts      │
                                  │  - WS client + 30s ping    │
                                  │  - port Set<Port>          │
                                  │  - reconnect backoff       │
                                  │  - broadcast on snapshot   │
                                  └──────────┬─────────────────┘
                                             │
                          (SW 已被 offscreen 5s ping 永久保活)
                                             │
                                             ▼ port.postMessage
                ┌───────────────────────────────────────────┐
                │  Content-script (tab N)                   │
                │  livedataClient.ts                        │
                │  - runtime.connect('perps-live')          │
                │  - cache latest snapshot                  │
                │  - expose subscribe API for future UI     │
                │                                           │
                │  widget bootstrap (top frame only)        │
                │  - closed Shadow DOM container (empty)    │
                │  - window.__rabbyPerpsDebug() in dev      │
                └───────────────────────────────────────────┘
                                             │ click (future UI)
                                             ▼
                                  chrome.tabs.create
                                  index.html#/desktop/perps
                                  (existing wallet.openInDesktop)
```

---

## 文件结构

### 新建文件

| 路径 | 职责 |
|---|---|
| `src/background/service/perpsLive.ts` | SW 端 perpsLive 服务:维护到 Hyperliquid 的 WS 单例(open/close、heartbeat 30s、reconnect-backoff、订阅切换),监听 preferenceService 账户/开关变化,管理 content-script port 集合,broadcast snapshot |
| `src/content-script/perps-widget/index.ts` | content-script 注入入口骨架,顶层文档守卫 + closed shadow root 容器 + 调试 hook;**不渲染 UI** |
| `src/content-script/perps-widget/livedataClient.ts` | content-script 端 port 客户端,缓存最新 snapshot,暴露 subscribe API 给未来 UI |
| `src/utils/message/perpsLive.ts` | SW ↔ content-script 共享的消息类型 + port name 常量 + snapshot 数据结构定义 |
| `docs/plans/2026-05-28-perps-floating-widget.md` | 本文档 |
| `docs/plans/2026-05-28-perps-floating-widget-smoketest.md` | Task 9 产出 |
| `docs/plans/2026-05-28-perps-floating-widget-security-qa.md` | Task 10 产出 |

### 修改的现有文件

| 路径 | 改动概要 |
|---|---|
| [`src/background/service/preference.ts`](../../src/background/service/preference.ts) | 新增字段:`currentPerpsAccountAddress: string \| null`、`perpsWidgetEnabled: boolean`(默认 `true`)、`perpsWidgetBlockedHosts: string[]`(默认 `[]`);提供 getter/setter,setter 内 emit 事件给 perpsLive 订阅 |
| [`src/background/index.ts`](../../src/background/index.ts) | 启动时 `perpsLive.boot()`;`runtime.onConnect` 监听器白名单加 `'perps-live'`,转交 perpsLive 服务 |
| [`src/background/controller/wallet.ts`](../../src/background/controller/wallet.ts) | 暴露 RPC 给 UI / content-script 调:`setCurrentPerpsAccountAddress`、`getCurrentPerpsAccountAddress`、`setPerpsWidgetEnabled`、`getPerpsWidgetEnabled`、`setPerpsWidgetBlockedHosts`、`getPerpsWidgetBlockedHosts` |
| [`src/content-script/index.ts`](../../src/content-script/index.ts) | 在合适时机 `import('./perps-widget')` 启动 widget 引导(动态 import 便于摇树,且条件加载) |
| [`src/ui/views/Perps/`](../../src/ui/views/Perps/) 内 Perps 账户初始化/切换处 | 当 Perps 账户(地址)确定后,调 `wallet.setCurrentPerpsAccountAddress(addr)` 写入 preferenceService;清空时同理 |

### 不需要改动

- `src/manifest/chrome-mv3/manifest.json` —— `host_permissions: <all_urls>` 已覆盖 Hyperliquid;`permissions` 已含 `offscreen`;`content_scripts` 已注入到所有 http/https/file;**无需新增 `side_panel`、`sidePanel` 权限、`web_accessible_resources`**
- `src/manifest/chrome-mv2/manifest.json` —— MV2 包默认不上 Perps 悬浮(优先做 Chrome MV3);未来需要时另开 plan
- `_raw/sw.js` —— SW bootloader 不需要改,perpsLive 通过 `background.js`(webpack 产物)被 `importScripts` 进来后自动 boot
- `src/offscreen/*` —— **保持原样**,offscreen 继续只做硬件钱包桥接 + SW 5s 保活 ping
- webpack 配置 —— content-script bundle 自动包含新增模块,无需新 entry

---

## 任务清单

### Task 0: 创建追踪用 worktree(可选,但推荐)

**Files:** —

- [ ] **Step 1: 准备 worktree**

```bash
git fetch
git worktree add ../Rabby-perps-widget -b feat/perps-floating-widget origin/develop
cd ../Rabby-perps-widget
yarn install --frozen-lockfile
```

- [ ] **Step 2: 确认 worktree 可独立构建**

```bash
yarn build:dev --env MANIFEST_TYPE=chrome-mv3
```
Expected: 构建成功生成 `dist/` 目录,与现有 develop 一致。

---

### Task 1: Manifest 与权限审计(已基本就位,只需 sanity check + top-frame 守卫策略文档化)

**Files:**
- Read-only: [`src/manifest/chrome-mv3/manifest.json`](../../src/manifest/chrome-mv3/manifest.json)
- 引用(后续 Task 6 才真正改): [`src/content-script/index.ts`](../../src/content-script/index.ts)

- [ ] **Step 1: 核对当前 manifest**

确认以下事实(已核对,记录留痕):
- `manifest_version: 3` ✅
- `host_permissions: ["<all_urls>"]` 覆盖 `api.hyperliquid.xyz` ✅
- `permissions` 含 `offscreen` ✅
- `content_scripts[0].all_frames: true`,`matches: ["file://*/*", "http://*/*", "https://*/*"]`
- **关键**:`all_frames: true` 意味着 content-script 在所有 iframe 也会执行。widget 注入必须在 **content-script JS 内部**用 `window === window.top` 守卫,**不**通过新增独立 content_scripts 段实现(避免改 manifest)

- [ ] **Step 2: 不改 manifest,记录守卫策略**

在本 plan 中记录:Task 6 实现 widget 引导时,首行加 `if (window.top !== window) return;` —— 不能放在 `content-script/index.ts` 的最外层(因为 page-provider 注入必须所有 frame 都跑),只能在 widget 模块内部守卫。

- [ ] **Step 3: Stage & 等用户确认提交**

本 Task 无代码改动,跳过 commit。

---

### Task 2: PreferenceService 扩展(三个新字段 + getter/setter)

**Files:**
- Modify: [`src/background/service/preference.ts`](../../src/background/service/preference.ts)
- Modify(同步暴露 RPC): [`src/background/controller/wallet.ts`](../../src/background/controller/wallet.ts)

- [ ] **Step 1: 读 `preference.ts` 现状,找 `PreferenceStore` interface 与默认值**

Run: 用 Read 工具读取文件,定位 `interface PreferenceStore`(或类似命名)和 `init`/`store.set` 默认值块。

- [ ] **Step 2: 在 `PreferenceStore` interface 加三个字段**

```ts
export interface PreferenceStore {
  // ...existing fields
  currentPerpsAccountAddress: string | null;
  perpsWidgetEnabled: boolean;
  perpsWidgetBlockedHosts: string[];
}
```

- [ ] **Step 3: 在默认值块补默认值**

```ts
const defaultPreference: PreferenceStore = {
  // ...existing defaults
  currentPerpsAccountAddress: null,
  perpsWidgetEnabled: true,
  perpsWidgetBlockedHosts: [],
};
```

注:`perpsWidgetEnabled` 默认 `true` 体现"配置过 Perps 账户就显示"语义(实际是否启动 WS 还要看 `currentPerpsAccountAddress` 是否非空,在 Task 4 守卫)。

- [ ] **Step 4: 添加 getter/setter 方法(沿用 preferenceService 现有方法命名风格)**

```ts
getCurrentPerpsAccountAddress = () => this.store.currentPerpsAccountAddress;

setCurrentPerpsAccountAddress = (addr: string | null) => {
  this.store.currentPerpsAccountAddress = addr;
  // 通知 perpsLive。具体 EventBus 名沿用 preferenceService 现有模式:
  // 若用 `EventEmitter`,emit 'perpsAccountChange';若用 redux-store-pattern,dispatch 对应 action
};

getPerpsWidgetEnabled = () => this.store.perpsWidgetEnabled;
setPerpsWidgetEnabled = (v: boolean) => {
  this.store.perpsWidgetEnabled = v;
  // 同上,emit 'perpsWidgetEnabledChange'
};

getPerpsWidgetBlockedHosts = () => this.store.perpsWidgetBlockedHosts;
setPerpsWidgetBlockedHosts = (hosts: string[]) => {
  this.store.perpsWidgetBlockedHosts = hosts;
};
```

- [ ] **Step 5: 在 `walletController` 暴露给 UI / content-script 端的 RPC 方法**

```ts
// src/background/controller/wallet.ts
setCurrentPerpsAccountAddress = preferenceService.setCurrentPerpsAccountAddress;
getCurrentPerpsAccountAddress = preferenceService.getCurrentPerpsAccountAddress;
setPerpsWidgetEnabled = preferenceService.setPerpsWidgetEnabled;
getPerpsWidgetEnabled = preferenceService.getPerpsWidgetEnabled;
setPerpsWidgetBlockedHosts = preferenceService.setPerpsWidgetBlockedHosts;
getPerpsWidgetBlockedHosts = preferenceService.getPerpsWidgetBlockedHosts;
```

- [ ] **Step 6: 单元测试(如 preferenceService 已有 jest 测试基建)**

如有 `__tests__/preference.test.ts` 或类似,补一组用例:
- 默认值正确
- set/get 往返
- 字段持久化到 storage(根据 preferenceService 测试既有套路)

如无现成测试基建,跳过 jest,改在 Task 9 集成自测里覆盖。

- [ ] **Step 7: Stage & 等用户确认提交**

```bash
git add src/background/service/preference.ts src/background/controller/wallet.ts
# 不自动 commit,告诉用户改动已就绪
```

---

### Task 3: SW ↔ Content-script 共享消息协议与类型定义

**Files:**
- Create: `src/utils/message/perpsLive.ts`

- [ ] **Step 1: 创建消息常量与类型文件**

```ts
// src/utils/message/perpsLive.ts

/** 用户在 Hyperliquid 上某个币种的持仓(只取 widget 需要的字段;完整字段后续按 UI 需求扩) */
export interface PerpsLivePosition {
  coin: string;
  szi: string;                 // 仓位数量,带方向(负=空)
  entryPx: string;
  positionValue: string;       // 当前持仓价值(USD)
  unrealizedPnl: string;       // 未实现盈亏(USD)
  returnOnEquity: string;      // ROE
  leverage: { type: 'cross' | 'isolated'; value: number };
  liquidationPx: string | null;
  marginUsed: string;
}

/** widget 关心的账户级聚合数据 */
export interface PerpsLiveSnapshot {
  address: string;
  accountValue: string;        // 账户总价值(USD)
  totalUnrealizedPnl: string;
  totalMarginUsed: string;
  positions: PerpsLivePosition[];
  /** 数据时间戳(epoch ms),用于上层判新旧 */
  ts: number;
}

/** SW → content-script(通过 port)broadcast 消息 */
export type PerpsLiveBroadcast =
  | { type: 'SNAPSHOT'; snapshot: PerpsLiveSnapshot }
  | { type: 'CLEARED' }                       // 账户被清空 / widget 被禁用
  | { type: 'WS_STATE'; state: 'connecting' | 'open' | 'closed' };

/** Content-script → SW(通过 port,预留给未来 UI 主动请求快照重发) */
export type PerpsLiveRequest =
  | { type: 'REQUEST_LATEST' };

/** port / runtime 命名常量 */
export const PERPS_LIVE_PORT_NAME = 'perps-live';
```

- [ ] **Step 2: 类型自洽性确认**

通过 `yarn tsc --noEmit`(仅本次单文件 sanity,后续不再每次跑)。Expected: 无 TS 报错。

- [ ] **Step 3: Stage & 等用户确认提交**

```bash
git add src/utils/message/perpsLive.ts
```

---

### Task 4: SW `perpsLive` 服务(WS 客户端 + 端口集合 + broadcast,合一)

**Files:**
- Create: `src/background/service/perpsLive.ts`
- Modify: [`src/background/index.ts`](../../src/background/index.ts)(`boot()` 调用 + `onConnect` 接入)

- [ ] **Step 1: 创建服务模块**

```ts
// src/background/service/perpsLive.ts
import {
  PerpsLiveBroadcast,
  PerpsLivePosition,
  PerpsLiveSnapshot,
  PERPS_LIVE_PORT_NAME,
} from '@/utils/message/perpsLive';
import preferenceService from './preference';

type Port = chrome.runtime.Port;

const HL_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

class PerpsLiveService {
  private ports = new Set<Port>();
  private latest: PerpsLiveSnapshot | null = null;
  private currentAddress: string | null = null;
  private ws: WebSocket | null = null;
  private reconnectMs = RECONNECT_INITIAL_MS;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;

  boot() {
    // 监听 preferenceService 账户变化与开关变化
    // (具体 hook 按 preferenceService 既有事件 API 调整)
    preferenceService.on?.('perpsAccountChange', (addr: string | null) => {
      this.applyAddress(addr);
    });
    preferenceService.on?.('perpsWidgetEnabledChange', () => {
      this.applyAddress(preferenceService.getCurrentPerpsAccountAddress());
    });

    // 启动时按当前持久化状态启动 WS
    this.applyAddress(preferenceService.getCurrentPerpsAccountAddress());
  }

  attachPort(port: Port) {
    this.ports.add(port);
    port.onDisconnect.addListener(() => {
      this.ports.delete(port);
    });
    // 新 port 上来,如果有缓存就立刻给一份
    if (this.latest) {
      this.send(port, { type: 'SNAPSHOT', snapshot: this.latest });
    }
  }

  private applyAddress(addr: string | null) {
    const enabled = preferenceService.getPerpsWidgetEnabled();
    const target = enabled ? addr : null;
    if (target === this.currentAddress) return;
    this.currentAddress = target;

    if (target) {
      this.connect(target);
    } else {
      this.disconnect();
      this.latest = null;
      this.broadcast({ type: 'CLEARED' });
    }
  }

  private connect(address: string) {
    this.disconnect();
    this.broadcast({ type: 'WS_STATE', state: 'connecting' });

    const sock = new WebSocket(HL_WS_URL);
    this.ws = sock;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      this.reconnectMs = RECONNECT_INITIAL_MS;
      this.broadcast({ type: 'WS_STATE', state: 'open' });

      // 订阅 webData2(账户全量)
      sock.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'webData2', user: address },
      }));

      // 心跳(Hyperliquid 推荐 30s)
      this.heartbeatTimer = self.setInterval(() => {
        if (sock.readyState === WebSocket.OPEN) {
          sock.send(JSON.stringify({ method: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL_MS) as unknown as number;
    };

    sock.onmessage = (e) => {
      if (this.ws !== sock || !this.currentAddress) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg?.channel === 'webData2' && msg?.data) {
          const snapshot = this.buildSnapshot(this.currentAddress, msg.data);
          this.latest = snapshot;
          this.broadcast({ type: 'SNAPSHOT', snapshot });
        }
        // 其它消息(pong, subscriptionResponse 等)忽略
      } catch (err) {
        console.warn('[perpsLive] parse failed', err);
      }
    };

    sock.onerror = () => {
      this.broadcast({ type: 'WS_STATE', state: 'closed' });
    };

    sock.onclose = () => {
      if (this.ws !== sock) return;
      this.ws = null;
      this.clearTimers();
      this.broadcast({ type: 'WS_STATE', state: 'closed' });
      if (this.currentAddress) {
        // 退避重连
        const delay = this.reconnectMs;
        this.reconnectMs = Math.min(this.reconnectMs * 2, RECONNECT_MAX_MS);
        this.reconnectTimer = self.setTimeout(() => {
          if (this.currentAddress) this.connect(this.currentAddress);
        }, delay) as unknown as number;
      }
    };
  }

  private disconnect() {
    this.clearTimers();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  private clearTimers() {
    if (this.reconnectTimer != null) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.heartbeatTimer != null) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private buildSnapshot(address: string, payload: any): PerpsLiveSnapshot {
    // Hyperliquid webData2 推送结构参见官方 docs。
    // 注:具体字段路径以联调时实际响应为准,这里给出推断结构,执行人需对照真实 payload 微调
    const clearinghouse = payload?.clearinghouseState ?? {};
    const summary = clearinghouse.marginSummary ?? {};
    const positions: PerpsLivePosition[] = (clearinghouse.assetPositions ?? [])
      .map((ap: any) => ap.position)
      .filter(Boolean)
      .map((p: any) => ({
        coin: p.coin,
        szi: p.szi,
        entryPx: p.entryPx,
        positionValue: p.positionValue,
        unrealizedPnl: p.unrealizedPnl,
        returnOnEquity: p.returnOnEquity,
        leverage: { type: p.leverage?.type ?? 'cross', value: Number(p.leverage?.value ?? 1) },
        liquidationPx: p.liquidationPx ?? null,
        marginUsed: p.marginUsed,
      }));

    return {
      address,
      accountValue: summary.accountValue ?? '0',
      totalUnrealizedPnl: positions
        .reduce((acc, p) => acc + Number(p.unrealizedPnl || 0), 0)
        .toString(),
      totalMarginUsed: summary.totalMarginUsed ?? '0',
      positions,
      ts: Date.now(),
    };
  }

  private broadcast(msg: PerpsLiveBroadcast) {
    for (const port of this.ports) {
      this.send(port, msg);
    }
  }

  private send(port: Port, msg: PerpsLiveBroadcast) {
    try { port.postMessage(msg); } catch {}
  }
}

export const perpsLive = new PerpsLiveService();
```

- [ ] **Step 2: 在 `background/index.ts` 启动 perpsLive 并接入 `onConnect`**

读 [`src/background/index.ts`](../../src/background/index.ts) 找现有 service `boot()` 集合 + `runtime.onConnect` listener。

```ts
// 启动块(找到 services 初始化的位置追加)
import { perpsLive } from './service/perpsLive';
import { PERPS_LIVE_PORT_NAME } from '@/utils/message/perpsLive';

perpsLive.boot();

// runtime.onConnect 监听器(现有为 popup/notification/tab/desktop 白名单,补一支)
browser.runtime.onConnect.addListener((port) => {
  if (port.name === PERPS_LIVE_PORT_NAME) {
    perpsLive.attachPort(port);
    return;
  }
  // ...existing branches
});
```

- [ ] **Step 3: TS 编译 sanity**

```bash
yarn tsc --noEmit
```
Expected: 无新增 TS 报错。

注意:`self.setInterval` / `self.setTimeout` 在 SW 上下文中正确,返回 number。SW 重启时这些 timer 会一并丢失,`boot()` 会在 SW 重启的初始执行被再次调用,自动重建 WS——这是符合预期的行为。

- [ ] **Step 4: Stage & 等用户确认提交**

```bash
git add src/background/service/perpsLive.ts src/background/index.ts
```

---

### Task 5: Content-script 端 livedata client(纯数据通路,无 UI)

**Files:**
- Create: `src/content-script/perps-widget/livedataClient.ts`

- [ ] **Step 1: 创建 client**

```ts
// src/content-script/perps-widget/livedataClient.ts
import browser from 'webextension-polyfill';
import {
  PerpsLiveBroadcast,
  PerpsLiveSnapshot,
  PERPS_LIVE_PORT_NAME,
} from '@/utils/message/perpsLive';

type Listener = (snapshot: PerpsLiveSnapshot | null) => void;

class LivedataClient {
  private port: browser.Runtime.Port | null = null;
  private latest: PerpsLiveSnapshot | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: number | null = null;

  start() {
    if (this.port) return;
    try {
      this.port = browser.runtime.connect({ name: PERPS_LIVE_PORT_NAME });
    } catch (err) {
      this.scheduleReconnect();
      return;
    }
    this.port.onMessage.addListener((msg: any) => {
      this.handle(msg as PerpsLiveBroadcast);
    });
    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.start();
    }, 1500);
  }

  private handle(msg: PerpsLiveBroadcast) {
    if (msg.type === 'SNAPSHOT') {
      this.latest = msg.snapshot;
    } else if (msg.type === 'CLEARED') {
      this.latest = null;
    }
    // WS_STATE 暂不持久化,UI 任务包再决定怎么用
    this.notify();
  }

  private notify() {
    for (const l of this.listeners) l(this.latest);
  }

  getLatest(): PerpsLiveSnapshot | null {
    return this.latest;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    l(this.latest);
    return () => { this.listeners.delete(l); };
  }
}

export const livedataClient = new LivedataClient();
```

- [ ] **Step 2: Stage & 等用户确认提交**

```bash
git add src/content-script/perps-widget/livedataClient.ts
```

---

### Task 6: Content-script widget 引导骨架(顶层守卫 + 容器 + 调试 hook,**无 UI**)

**Files:**
- Create: `src/content-script/perps-widget/index.ts`
- Modify: [`src/content-script/index.ts`](../../src/content-script/index.ts)(条件加载 widget)

- [ ] **Step 1: 创建引导文件**

```ts
// src/content-script/perps-widget/index.ts
import { livedataClient } from './livedataClient';

const SHADOW_HOST_ID = '__rabby_perps_widget_host__';

function isTopFrame(): boolean {
  try { return window.top === window; } catch { return false; }
}

function hostIsBlocked(blocked: string[]): boolean {
  try {
    const h = window.location.hostname;
    return blocked.some((b) => h === b || h.endsWith(`.${b}`));
  } catch { return true; }
}

function mountContainer(): ShadowRoot | null {
  if (document.getElementById(SHADOW_HOST_ID)) return null;
  const host = document.createElement('div');
  host.id = SHADOW_HOST_ID;
  // 不设可见样式 —— UI Task 包再决定 z-index/position 等
  (document.body ?? document.documentElement).appendChild(host);
  return host.attachShadow({ mode: 'closed' });
}

function installDebugHook() {
  if (process.env.NODE_ENV !== 'production') {
    (window as any).__rabbyPerpsDebug = () => livedataClient.getLatest();
  }
}

export interface BootOptions {
  enabled: boolean;
  blockedHosts: string[];
}

export function bootPerpsWidget(opts: BootOptions) {
  if (!isTopFrame()) return;
  if (!opts.enabled) return;
  if (hostIsBlocked(opts.blockedHosts)) return;

  // 等 body 就绪再挂(content_scripts 在 document_start 注入)
  const onReady = () => {
    const root = mountContainer();
    if (!root) return;
    livedataClient.start();
    installDebugHook();
    // UI Task 包将在此处往 `root` 渲染球与弹层
  };

  if (document.body) {
    onReady();
  } else {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  }
}
```

- [ ] **Step 2: 在 `content-script/index.ts` 条件加载**

读取 [`src/content-script/index.ts`](../../src/content-script/index.ts) 现状,在合适位置(provider 注入之后,不阻塞 provider)追加:

```ts
// 查询 SW 当前 widget 偏好,然后启动 widget(失败安静跳过,绝不影响 provider 主路径)
import browser from 'webextension-polyfill';
(async () => {
  try {
    const enabled = await browser.runtime.sendMessage({
      type: 'controller',
      method: 'getPerpsWidgetEnabled',
      params: [],
    });
    const blockedHosts = await browser.runtime.sendMessage({
      type: 'controller',
      method: 'getPerpsWidgetBlockedHosts',
      params: [],
    });
    if (enabled) {
      const { bootPerpsWidget } = await import('./perps-widget');
      bootPerpsWidget({ enabled: true, blockedHosts: blockedHosts ?? [] });
    }
  } catch {
    // SW 未就绪/不可达 —— 静默跳过,不影响 page provider
  }
})();
```

注:具体 RPC 消息格式遵循 Rabby 现有 [`PortMessage`](../../src/utils/message/portMessage.ts) 协议——执行 Task 时按现有 `controller` 路径正确调用即可。

- [ ] **Step 3: Stage & 等用户确认提交**

```bash
git add src/content-script/perps-widget/index.ts src/content-script/index.ts
```

---

### Task 7: Perps 账户切换同步到 preferenceService

**Files:**
- Modify: Perps 账户初始化/切换发生的位置(由执行人定位)

- [ ] **Step 1: 定位 Perps 账户绑定/切换点**

通过 grep 找以下任一线索:
- `currentPerpsAccount`(Redux model)在 dispatch action 中赋值的位置
- Perps "login" / "init" / "bindAccount" 方法

```bash
# 示例搜索关键词(执行人按 grep 结果定位真正改动点)
# - perpsState\.currentPerpsAccount
# - dispatch.perps.setCurrentPerpsAccount
# - 'perps/setCurrentAccount'
```

- [ ] **Step 2: 在绑定/切换点写入 preferenceService**

```ts
// 在 Perps 账户成功绑定/选定后,以下任一形式
await wallet.setCurrentPerpsAccountAddress(account.address);

// 在 Perps 退出/解绑时
await wallet.setCurrentPerpsAccountAddress(null);
```

- [ ] **Step 3: 主钱包账户切换的联动**

Rabby 切换主账户时,若新账户对应的 Perps 账户不同,应:
- 找到主账户切换 hook(`preferenceService.setCurrentAccount` 或类似)
- 在其 emit 流程中触发 Perps 账户重映射或清空 `currentPerpsAccountAddress`

具体策略需对照 Perps 现有 onboarding 流程确认:Perps 账户与 Rabby 主账户是否 1:1。若是 1:1,在主账户切换时直接清空即可(等用户重新进入 Perps 触发新一次 set)。

- [ ] **Step 4: Stage & 等用户确认提交**

---

### Task 8: 全局开关与黑名单事件通路(无 UI)

**Files:**
- Read-only(已在 Task 2 加 setter): [`src/background/service/preference.ts`](../../src/background/service/preference.ts)
- Read-only(已在 Task 4 监听): `src/background/service/perpsLive.ts`

- [ ] **Step 1: 确认 setter 内 emit 事件已就位**

回查 Task 2 Step 4,确认 `setPerpsWidgetEnabled` 内 emit `'perpsWidgetEnabledChange'`,`setCurrentPerpsAccountAddress` 内 emit `'perpsAccountChange'`。

- [ ] **Step 2: 确认 perpsLive.boot() 内已订阅**

回查 Task 4 Step 1 `boot()` 块,确认两个事件均订阅,均会触发 `applyAddress()` 重评估。

- [ ] **Step 3: content-script 端响应 enabled 变化的策略**

content-script 进程不会持久驻留页面后才被告知;较简方案:页面下次刷新生效。这条路够 v1。

若需即时,可在 perpsLive 收到 enabled=false 时已经 broadcast 一条 `{ type: 'CLEARED' }`(Task 4 `applyAddress` 内已实现),content-script 侧 livedataClient 收到后由 widget 决定卸载(由未来 UI Task 实现)。本 plan 仅保证消息通路,不实现卸载。

- [ ] **Step 4: Stage & 等用户确认提交**

本 Task 无新增代码(Task 2/4 已覆盖),仅做核对。

---

### Task 9: 集成自测路径文档化(无 UI 也能验证)

**Files:**
- Create: `docs/plans/2026-05-28-perps-floating-widget-smoketest.md`

- [ ] **Step 1: 写自测剧本**

```markdown
# Perps 悬浮组件 — 数据管线自测(无 UI 也可跑)

## 前置
- chrome-mv3 dev build:`yarn build:dev`(MANIFEST_TYPE=chrome-mv3)
- Chrome 加载 `dist/` 未打包扩展
- Rabby 钱包已导入一个**有 Hyperliquid 真实仓位**的地址(或测试网地址)

## 步骤
1. 打开 Rabby popup → 进入 Perps → 完成 Perps 账户初始化(确认有持仓)
2. 关闭 popup
3. 打开任意 https 网页(例如 `https://example.com`)
4. 打开 DevTools Console,运行:
   ```js
   window.__rabbyPerpsDebug()
   ```
5. **Expected:** 返回一个 `PerpsLiveSnapshot` 对象,包含 `address`、`accountValue`、`positions[]`,且 `ts` 是几秒内的时间戳
6. 等 10–30 秒,再次运行:`__rabbyPerpsDebug()`
   - **Expected:** `ts` 字段有变化(说明 WS 在持续推送)
7. 在 Hyperliquid 网页(独立窗口)调整一笔限价单 / 改杠杆,30 秒内 step 6 应反映新数据

## 通过判定
- ✅ snapshot 能拿到且字段非空
- ✅ ts 在 30s 内会刷新
- ✅ Hyperliquid 操作能在 widget 端看到反映

## 失败排查
- snapshot 为 null → 在 chrome://extensions 进入 Rabby 的 SW DevTools,看 perpsLive 启动日志、WS 状态;确认 preferenceService 里 `currentPerpsAccountAddress` 已写入
- snapshot 不刷新 → SW console 看 onmessage 是否被触发,`buildSnapshot` 字段路径是否对得上当前 Hyperliquid payload
- 跨 tab 不一致 → 检查 perpsLive 的 port set 大小是否随 tab 增减
- SW 莫名重启 → 确认 offscreen 5s ping 仍在跑(offscreen DevTools 控制台)
```

- [ ] **Step 2: Stage & 等用户确认提交**

---

### Task 10: 安全审查清单 + 跨站 QA 矩阵(文档型)

**Files:**
- Create: `docs/plans/2026-05-28-perps-floating-widget-security-qa.md`

- [ ] **Step 1: 写清单**

```markdown
# Perps 悬浮组件 — 安全审查清单与跨站 QA 矩阵

## 新增攻击面(待 security-reviewer 审)
1. **新增 content-script 注入 DOM** —— Rabby 历史上 content-script 零 UI 注入。审查点:
   - Shadow DOM 必须用 `mode: 'closed'`(避免宿主页面 querySelectorAll 读到 PnL 数字)
   - 注入元素的 id/class 不能与宿主页冲突且不可被宿主 CSS 影响(独立 shadow root 即可)
   - 注入元素若被宿主 DOM 操作劫持(例如宿主移除/克隆),widget 行为应安全降级
2. **content-script 与 SW 间多了一个 port `perps-live`** —— 审查点:
   - 端口建立无权限验证(content-script 来源固定);确认无被恶意页 fake 的可能(content-script bundle 由扩展加载,不可被页面注入)
3. **SW 维持长连接到 Hyperliquid** —— 审查点:
   - 推送回的数据被反序列化,需确认 `JSON.parse` 后不直接进 `innerHTML`(本 plan 无 UI 渲染,UI Task 包再核)
   - WS URL 硬编码,无注入风险;若未来从 preferenceService 读 URL,需 allowlist
4. **preferenceService 新增明文字段** —— `currentPerpsAccountAddress` 是公开链上数据,明文可接受;`perpsWidgetBlockedHosts` 由用户自填,需校验是合法 hostname,防注入(虽然下游只做字符串比较,但安全审查习惯加一道)
5. **SW 永不休眠的影响** —— Rabby SW 本来就被 offscreen 5s ping 钉住,perpsLive 加入 WS 后 SW 负担略增但不质变;审查点:SW 内存增长(WS buffer + ports + latest snapshot)需有上限,长时间运行无泄漏

## 跨站 QA 矩阵(UI 落地后跑)
| 站点类型 | 代表网站 | 验证点 |
|---|---|---|
| 普通内容站 | medium.com / wikipedia.org | 球渲染、不影响页面布局 |
| 高 z-index 站(模态/广告) | reddit.com / 知乎 | 球被遮 / 球遮内容的边界 |
| 严格 CSP 站 | github.com / google.com | content-script 注入 DOM 在 strict CSP 下是否正常(content-script DOM 不受页面 CSP `script-src` 限制,但 `style-src` 可能限内联样式 → 用 CSSStyleSheet API) |
| SPA(history 路由) | twitter.com | 路由跳转后 widget 不重复注入、不消失 |
| 嵌套 iframe 多的站 | youtube.com / google docs | 只在顶层注入(`window.top === window` 守卫) |
| 文件 / 特殊页 | `file://` 本地 html / about:blank | 不崩溃即可 |
| 已知爆雷历史 | airbnb.com、各种付款流程站 | DOM 操作不影响业务交互 |
| Chrome 内部页 | chrome://settings | content-script 不会跑(预期) |
| PDF 查看器 | 任意 .pdf 直链 | content-script 不会跑(预期) |
| 主流交易所站 | binance.com / okx.com | 不与其本身的网页钱包按钮冲突 |

## 性能 QA
- content-script bundle 体积增量 < 30KB(gzip)目标
- widget 启动到 livedataClient.start() 完成 < 50ms
- WS 闲置时 CPU 占用 < 0.5%
- SW 长时间运行(24h+)无内存泄漏(snapshot 不堆积、ports Set 正确清理)
```

- [ ] **Step 2: Stage & 等用户确认提交**

---

## 待 UI 稿落地后追加的任务(本 plan 不展开)

| 编号 | 内容 | 阻塞依赖 |
|---|---|---|
| UI-1 | 球渲染(尺寸、位置、PnL 颜色) | 视觉稿 |
| UI-2 | hover/click 弹层展开布局 | 视觉稿 + 交互稿 |
| UI-3 | 拖拽 + 贴边 + 位置 chrome.storage 持久化 | 交互稿 |
| UI-4 | 点击 → `wallet.openInDesktop('/desktop/perps')` 接线 | 现有基建即可,等弹层布局定 |
| UI-5 | 设置页 UI(开关 + 黑名单管理) | 设置页设计 |
| UI-6 | i18n(en.json) | UI 文案 |
| UI-7 | enabled 变化即时卸载(可选) | 产品确认是否必要 |
| UI-8 | 跨站 QA 执行(按 Task 10 矩阵) | UI 全部落地 |
| UI-9 | security-reviewer 全量审 | UI 全部落地 |

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| MV3 SW 休眠导致 WS 断 | **不会发生**:Rabby SW 已被 offscreen 5s ping 永久保活;本架构选择前置利用了这个现状 |
| SW 重启(扩展更新/崩溃)导致 WS 断 | `perpsLive.boot()` 在 SW 重启的初始执行被再次调用,从 preferenceService 读地址重连;前端 livedataClient 同样有 1.5s 退避重连 |
| Hyperliquid `webData2` 字段后续变更 | `buildSnapshot` 内部容错,字段缺失时给默认值,联调时与真实 payload 对齐一次 |
| 多账户切换时 WS 闪断 | `applyAddress(newAddr)` → `connect(newAddr)` 内部先 close 再 open,1~2 秒可恢复 |
| content-script 在每个页面跑,启动慢 | widget 加载用动态 `import()`,被 `perpsWidgetEnabled=false` 守卫挡掉时 0 加载 |
| 宿主网页 CSP `frame-src`/`script-src` 限制 | 不用 iframe 不用页面 inline script,Shadow DOM + CSSStyleSheet API,绕开页面 CSP |
| 黑名单/白名单逻辑随站点演进 | preferenceService 字段已就位,UI Task 实现管理界面后端到端可用 |
| Perps 账户与 Rabby 主账户切换不一致 | Task 7 显式 handle,清空时停 WS 不留脏数据 |
| 隐私顾虑(锁定时显示 PnL) | 产品决策已确认默认显示完整数字,用户嫌烦从设置整体关闭 |
| SW 内存随运行时间累积 | snapshot 只保留 latest,ports Set 在 disconnect 时清理;Task 10 安全清单已列为审查点 |

---

## 执行约定

- 所有 Task 内 `Stage & 等用户确认提交` 严格生效:本 plan 中 `git commit` 步骤只是工作单元划分,实际执行由用户审批触发,执行人不得自动 commit
- TS 编译验证(`yarn tsc --noEmit`)按用户 `no-redundant-validation` 规则,**仅在跨文件类型改动收尾时跑一次**,不每 Task 跑
- jest 单测仅 Task 2 在 preferenceService 已有测试基建时补;否则全部用 Task 9 的集成自测代替
- 所有文件路径以 `src/...` 开头,执行人按 Rabby 现有 import alias(`@/...`)调整
