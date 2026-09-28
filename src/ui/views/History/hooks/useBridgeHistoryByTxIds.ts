import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { TransactionGroup } from '@/background/service/transactionHistory';
import { useWallet } from '@/ui/utils';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { BRIDGE_HISTORY_EMPTY_NO_CACHE_MS } from '@/ui/views/Bridge/constants';
import { isEqual } from 'lodash';
import PQueue from 'p-queue';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BRIDGE_HISTORY_INIT_SCAN_LIMIT,
  BRIDGE_HISTORY_TX_BATCH,
  HistoryListRow,
  collectInitialBridgeTxIds,
  collectViewportOutgoingTxIds,
  historyTxKey,
  shouldCacheEmptyBridgeResult,
  shouldPollPendingBridge,
} from '../utils/mergeBridgeHistory';

type LookupItem = {
  id: string;
  cate_id?: string | null;
  is_scam?: boolean;
  sends?: unknown[] | null;
  token_approve?: unknown;
  chain: string;
  owner_addr?: string;
  time_at?: number;
  tx?: { from_addr?: string } | null;
};

const POLL_INTERVAL_MS = 3000;
// 缓存过期只会多查几条，不会漏查。
const EXCLUDED_TX_IDS_TTL_MS = 60 * 1000;

// 会话缓存，切页保留，关闭插件页面释放。
// 缓存稳定空结果，pending 定时刷新。
// 新交易空结果延迟到上链满 3 分钟后补查。
type LookupSession = {
  requested: Set<string>;
  deferred: Map<string, number>;
  scheduled: Set<string>;
  running: Set<string>;
  results: Map<string, BridgeHistory>;
  excluded?: { at: number; ids: Promise<Set<string>> };
  listeners: Set<() => void>;
  queue: PQueue;
  lastPoll: number;
};
const sessions = new Map<string, LookupSession>();
const getSession = (address: string): LookupSession => {
  const key = address.toLowerCase();
  let session = sessions.get(key);
  if (!session) {
    session = {
      requested: new Set(),
      deferred: new Map(),
      scheduled: new Set(),
      running: new Set(),
      results: new Map(),
      listeners: new Set(),
      queue: new PQueue({ interval: 1000, intervalCap: 2, concurrency: 2 }),
      lastPoll: 0,
    };
    sessions.set(key, session);
  }
  return session;
};

const lookupSkipSet = (session: LookupSession) =>
  new Set([
    ...session.requested,
    ...session.deferred.keys(),
    ...session.scheduled,
  ]);

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

export const useBridgeHistoryByTxIds = (options: {
  enabled: boolean;
  address?: string;
  items: LookupItem[];
}) => {
  const { enabled, address = '', items } = options;
  const wallet = useWallet();
  const [bridges, setBridges] = useState<BridgeHistory[]>([]);
  const session = useMemo(() => getSession(address), [address]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled || !address) {
      setBridges([]);
      return;
    }
    const refresh = () => setBridges(Array.from(session.results.values()));
    session.listeners.add(refresh);
    refresh();
    return () => {
      session.listeners.delete(refresh);
      if (!session.listeners.size) {
        // 取消排队任务；在途请求回填原地址缓存。
        session.queue.clear();
        session.deferred.clear();
        session.scheduled.forEach((id) => {
          if (!session.running.has(id)) session.scheduled.delete(id);
        });
      }
    };
  }, [address, enabled, session]);

  /** 请求去重，每秒最多 2 批。轮询的 id 已确认是 Bridge，跳过本地排除。 */
  const enqueueIds = useCallback(
    (ids: string[], mode: 'lookup' | 'poll' | 'retry' = 'lookup') => {
      if (!enabled || !address) return;
      const polling = mode === 'poll';
      const fresh: string[] = [];
      ids.forEach((id) => {
        const key = id.toLowerCase();
        if (
          !key ||
          session.scheduled.has(key) ||
          (!polling &&
            (session.requested.has(key) ||
              (mode !== 'retry' && session.deferred.has(key))))
        ) {
          return;
        }
        session.scheduled.add(key);
        fresh.push(id);
      });
      for (
        let index = 0;
        index < fresh.length;
        index += BRIDGE_HISTORY_TX_BATCH
      ) {
        const batch = fresh.slice(index, index + BRIDGE_HISTORY_TX_BATCH);
        const timeById = new Map(
          itemsRef.current.map((item) => [item.id.toLowerCase(), item.time_at])
        );
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
              candidates = batch.filter(
                (id) => !excludedIds.has(id.toLowerCase())
              );
            }
            // 页面关闭后不再发起新请求。
            if (!session.listeners.size) return;
            const res = candidates.length
              ? await wallet.openapi.getBridgeHistoryListByTxIds({
                  from_tx_ids: candidates,
                })
              : undefined;
            const list = res?.history_list || [];
            let changed = false;
            list.forEach((item) => {
              const key = historyTxKey(
                item.from_token?.chain,
                item.from_tx?.tx_id
              );
              if (!isEqual(session.results.get(key), item)) {
                session.results.set(key, item);
                changed = true;
              }
            });
            const found = new Set(
              list.map((item) => item.from_tx?.tx_id?.toLowerCase())
            );
            const candidateKeys = new Set(
              candidates.map((id) => id.toLowerCase())
            );
            keys.forEach((key) => {
              if (
                candidateKeys.has(key) &&
                !found.has(key) &&
                !shouldCacheEmptyBridgeResult(timeById.get(key))
              ) {
                const retryAt =
                  timeById.get(key)! * 1000 + BRIDGE_HISTORY_EMPTY_NO_CACHE_MS;
                if (session.deferred.get(key) !== retryAt) {
                  session.deferred.set(key, retryAt);
                  changed = true;
                }
                return;
              }
              if (session.deferred.delete(key)) changed = true;
              session.requested.add(key);
            });
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
    },
    [address, enabled, session, wallet]
  );

  useEffect(() => {
    if (!enabled || !address || !items.length) return;
    if (
      !items.some(
        (item) => item.owner_addr?.toLowerCase() === address.toLowerCase()
      )
    ) {
      return;
    }
    // DB 更新后重扫前 100 条。
    // 每轮最多 20 个新候选，缓存去重。
    const { ids } = collectInitialBridgeTxIds(
      items,
      address,
      lookupSkipSet(session),
      0,
      BRIDGE_HISTORY_TX_BATCH,
      BRIDGE_HISTORY_INIT_SCAN_LIMIT
    );
    enqueueIds(ids);
  }, [address, enabled, enqueueIds, items, session]);

  useEffect(() => {
    if (!enabled || !address) return;
    const pendingIds = () =>
      Array.from(session.results.values())
        .filter((item) => shouldPollPendingBridge(item))
        .map((item) => item.from_tx?.tx_id)
        .filter((id): id is string => !!id);
    if (!pendingIds().length && !session.deferred.size) return;
    const timer = setInterval(() => {
      const ids = pendingIds();
      // 无 pending 且无待补查记录时停止。
      if (!ids.length && !session.deferred.size) {
        clearInterval(timer);
        return;
      }
      if (
        session.queue.size ||
        session.queue.pending ||
        Date.now() - session.lastPoll < POLL_INTERVAL_MS
      ) {
        return;
      }
      session.lastPoll = Date.now();
      const retryIds = Array.from(session.deferred.entries())
        .filter(([, retryAt]) => retryAt <= Date.now())
        .map(([id]) => id);
      enqueueIds(ids, 'poll');
      enqueueIds(retryIds, 'retry');
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [address, enabled, enqueueIds, bridges, session]);

  /** 滚动时只查可见行所在的 20 条批次。 */
  const onRangeChanged = useCallback(
    (
      startIndex: number,
      endIndex: number,
      rows: HistoryListRow<{ chain: string; id: string }>[]
    ) => {
      if (!enabled || !address) return;
      const items = itemsRef.current;
      const indexByKey = new Map(
        items.map((item, index) => [historyTxKey(item.chain, item.id), index])
      );
      let start = items.length;
      let end = -1;
      for (let index = startIndex; index <= endIndex; index += 1) {
        const row = rows[index];
        if (!row) continue;
        const chain =
          row.kind === 'tx' ? row.item.chain : row.item.from_token?.chain;
        const id = row.kind === 'tx' ? row.item.id : row.item.from_tx?.tx_id;
        const originalIndex = indexByKey.get(historyTxKey(chain, id));
        if (originalIndex == null) continue;
        start = Math.min(start, originalIndex);
        end = Math.max(end, originalIndex);
      }
      if (end < 0) return;
      enqueueIds(
        collectViewportOutgoingTxIds(
          items,
          address,
          lookupSkipSet(session),
          start,
          end
        )
      );
    },
    [address, enabled, enqueueIds, session]
  );

  return { bridges, onRangeChanged };
};
