import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import PQueue from 'p-queue';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BRIDGE_HISTORY_INIT_SCAN_LIMIT,
  BRIDGE_HISTORY_TX_BATCH,
  HistoryListRow,
  collectInitialBridgeTxIds,
  collectViewportOutgoingTxIds,
  historyTxKey,
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
  tx?: { from_addr?: string } | null;
};

// 会话缓存，切页保留，关闭插件页面释放。
// 缓存空结果，仅 pending 定时刷新。
type LookupSession = {
  requested: Set<string>;
  scheduled: Set<string>;
  running: Set<string>;
  results: Map<string, BridgeHistory>;
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
        session.scheduled.forEach((id) => {
          if (!session.running.has(id)) session.scheduled.delete(id);
        });
      }
    };
  }, [address, enabled, session]);

  /** 请求去重，每秒最多 2 批。 */
  const enqueueIds = useCallback(
    (ids: string[], polling = false) => {
      if (!enabled || !address) return;
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
      for (
        let index = 0;
        index < fresh.length;
        index += BRIDGE_HISTORY_TX_BATCH
      ) {
        const batch = fresh.slice(index, index + BRIDGE_HISTORY_TX_BATCH);
        session.queue.add(async () => {
          const keys = batch.map((id) => id.toLowerCase());
          keys.forEach((id) => session.running.add(id));
          try {
            // 按本地来源排除非 Bridge 交易。
            const { pendings, completeds } = await wallet.getTransactionHistory(
              address
            );
            // 页面关闭后不再发起新请求。
            if (!session.listeners.size) return;
            const excludedIds = new Set(
              [...pendings, ...completeds].flatMap((group) => {
                const ga = group.$ctx?.ga;
                // 保留 bridge 来源的各状态记录。
                // 跨链可含 swap，只按发起来源判断。
                const nonBridgeSources = [
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
                const isNonBridgeFlow =
                  ga?.source === 'bridge'
                    ? false
                    : ga?.category === 'Send' ||
                      ga?.category === 'Swap' ||
                      nonBridgeSources.includes(ga?.source);
                return group.txs
                  .filter(
                    (tx) =>
                      isNonBridgeFlow ||
                      (tx.site?.origin &&
                        tx.site.origin !== INTERNAL_REQUEST_ORIGIN)
                  )
                  .map((tx) => tx.hash?.toLowerCase());
              })
            );
            const candidates = batch.filter(
              (id) => !excludedIds.has(id.toLowerCase())
            );
            const res = candidates.length
              ? await wallet.openapi.getBridgeHistoryListByTxIds({
                  from_tx_ids: candidates,
                })
              : undefined;
            keys.forEach((id) => session.requested.add(id));
            (res?.history_list || []).forEach((item) => {
              session.results.set(
                historyTxKey(item.from_token?.chain, item.from_tx?.tx_id),
                item
              );
            });
            session.listeners.forEach((notify) => notify());
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
      new Set([...session.requested, ...session.scheduled]),
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
    if (!pendingIds().length) return;
    const timer = setInterval(() => {
      const ids = pendingIds();
      // 无有效 pending 时停止，新 pending 到来时重启。
      if (!ids.length) {
        clearInterval(timer);
        return;
      }
      if (
        session.queue.size ||
        session.queue.pending ||
        Date.now() - session.lastPoll < 3000
      ) {
        return;
      }
      session.lastPoll = Date.now();
      enqueueIds(ids, true);
    }, 3000);
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
      const skip = new Set([...session.requested, ...session.scheduled]);
      enqueueIds(
        collectViewportOutgoingTxIds(items, address, skip, start, end)
      );
    },
    [address, enabled, enqueueIds, session]
  );

  return { bridges, onRangeChanged };
};
