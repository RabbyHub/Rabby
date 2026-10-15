import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { TransactionGroup } from '@/background/service/transactionHistory';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { isEqual } from 'lodash';
import PQueue from 'p-queue';
import { BRIDGE_HISTORY_TX_BATCH, historyTxKey } from './mergeBridgeHistory';
import { getBridgeHistoryTop10 } from '@/ui/views/Bridge/utils/historyCache';

// 缓存过期只会多查几条，不会漏查。
const EXCLUDED_TX_IDS_TTL_MS = 60 * 1000;

// 会话缓存，切页保留，关闭插件页面释放。
// 空结果也缓存，仅 pending 定时刷新。
type LookupSession = {
  recent?: BridgeHistory[];
  snapshot: BridgeHistory[];
  requested: Set<string>;
  scheduled: Set<string>;
  running: Set<string>;
  results: Map<string, BridgeHistory>;
  excluded?: { at: number; ids: Promise<Set<string>> };
  listeners: Set<() => void>;
  queue: PQueue;
  lastPoll: number;
};
const sessions = new Map<string, LookupSession>();
export const getBridgeLookupSession = (address: string): LookupSession => {
  const key = address.toLowerCase();
  let session = sessions.get(key);
  if (!session) {
    session = {
      snapshot: [],
      requested: new Set(),
      scheduled: new Set(),
      running: new Set(),
      results: new Map(),
      listeners: new Set(),
      queue: new PQueue({ interval: 1000, intervalCap: 2, concurrency: 2 }),
      lastPoll: 0,
    };
    sessions.set(key, session);
  }
  // 每次进入读取缓存，同一份缓存不覆盖已轮询的新结果。
  const recent = getBridgeHistoryTop10(key);
  if (session.recent !== recent) {
    session.recent = recent;
    for (const item of recent) {
      if (item.from_tx?.tx_id) {
        session.requested.add(item.from_tx.tx_id.toLowerCase());
      }
    }
    cacheBridgeResults(session, recent);
  }
  return session;
};

const cacheBridgeResults = (session: LookupSession, list: BridgeHistory[]) => {
  let changed = false;
  list.forEach((item) => {
    const key = historyTxKey(item.from_token?.chain, item.from_tx?.tx_id);
    if (!isEqual(session.results.get(key), item)) {
      session.results.set(key, item);
      changed = true;
    }
  });
  if (changed) session.snapshot = Array.from(session.results.values());
  return changed;
};

/** 首次渲染即读共享缓存，避免先显示普通交易再替换。 */
export const getBridgeLookupSnapshot = (session: LookupSession) =>
  session.snapshot;

export const lookupSkipSet = (session: LookupSession) =>
  new Set([...session.requested, ...session.scheduled]);

const NON_BRIDGE_SOURCES = [
  'sendToken',
  'swap',
  'sendNFT',
  'tokenApproval',
  'nftApproval',
  'Perps',
  'Staking',
  'cancel',
  'speedUp',
];

/** 按本地来源排除非 Bridge 交易。 */
const collectNonBridgeTxIds = (groups: TransactionGroup[]) =>
  new Set<string>(
    groups.flatMap((group) => {
      const ga = group.$ctx?.ga;
      // 保留 bridge 来源的各状态记录。
      // 跨链可含 swap，只按发起来源判断。
      const isNonBridgeFlow =
        ga?.source === 'bridge'
          ? false
          : ga?.category === 'Send' ||
            ga?.category === 'Swap' ||
            NON_BRIDGE_SOURCES.includes(ga?.source);
      return group.txs
        .filter(
          (tx) =>
            isNonBridgeFlow ||
            (tx.site?.origin && tx.site.origin !== INTERNAL_REQUEST_ORIGIN)
        )
        .flatMap((tx) => (tx.hash ? [tx.hash.toLowerCase()] : []));
    })
  );

const getExcludedTxIds = (
  session: LookupSession,
  load: () => Promise<Set<string>>
) => {
  const cached = session.excluded;
  if (cached && Date.now() - cached.at < EXCLUDED_TX_IDS_TTL_MS) {
    return cached.ids;
  }
  const entry = { at: Date.now(), ids: load() };
  session.excluded = entry;
  entry.ids.catch(() => {
    if (session.excluded === entry) session.excluded = undefined;
  });
  return entry.ids;
};

/** 订阅当前地址；最后一个订阅退出时清理排队任务。 */
export const subscribeBridgeLookup = (
  session: LookupSession,
  notify: () => void
) => {
  session.listeners.add(notify);
  return () => {
    session.listeners.delete(notify);
    if (session.listeners.size) return;
    session.queue.clear();
    session.scheduled.forEach((id) => {
      if (!session.running.has(id)) session.scheduled.delete(id);
    });
  };
};

/** 统一处理去重、分批、本地过滤和结果缓存。 */
export const enqueueBridgeLookups = (
  session: LookupSession,
  wallet: WalletControllerType,
  address: string,
  ids: string[],
  polling = false
) => {
  const fresh: string[] = [];
  ids.forEach((id) => {
    const key = id.toLowerCase();
    if (
      !key ||
      session.scheduled.has(key) ||
      (!polling && session.requested.has(key))
    ) {
      return;
    }
    session.scheduled.add(key);
    fresh.push(id);
  });
  for (let index = 0; index < fresh.length; index += BRIDGE_HISTORY_TX_BATCH) {
    const batch = fresh.slice(index, index + BRIDGE_HISTORY_TX_BATCH);
    session.queue.add(async () => {
      const keys = batch.map((id) => id.toLowerCase());
      keys.forEach((id) => session.running.add(id));
      try {
        let candidates = batch;
        if (!polling) {
          const excludedIds = await getExcludedTxIds(session, () =>
            wallet
              .getTransactionHistory(address)
              .then(({ pendings, completeds }) =>
                collectNonBridgeTxIds([...pendings, ...completeds])
              )
          );
          candidates = batch.filter((id) => !excludedIds.has(id.toLowerCase()));
        }
        // 页面关闭后不再发起新请求。
        if (!session.listeners.size) return;
        const res = candidates.length
          ? await wallet.openapi.getBridgeHistoryListByTxIds({
              from_tx_ids: candidates,
            })
          : undefined;
        const list = res?.history_list || [];
        const changed = cacheBridgeResults(session, list);
        keys.forEach((key) => session.requested.add(key));
        if (changed) session.listeners.forEach((notify) => notify());
      } catch {
        // 请求失败不缓存，允许重试。
      } finally {
        keys.forEach((id) => {
          session.running.delete(id);
          session.scheduled.delete(id);
        });
      }
    });
  }
};
