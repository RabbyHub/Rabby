import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import PQueue from 'p-queue';
import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * 三个入口只负责挑出要查的哈希，真正发请求都交给 enqueueIds。
 * - 初始化：从最新记录向后找，凑满 20 条候选、扫满 100 条，或数据库结束。
 * - 滚动：只查当前可见窗口所在的 20 条批次，不向窗口外补。
 * - 轮询：只刷新已经识别、且仍是 pending、创建未满 2h 的跨链。
 */
export const useBridgeHistoryByTxIds = (options: {
  enabled: boolean;
  address?: string;
  items: LookupItem[];
}) => {
  const { enabled, address = '', items } = options;
  const wallet = useWallet();
  const [bridges, setBridges] = useState<BridgeHistory[]>([]);
  const hasPendingBridge = bridges.some((item) =>
    shouldPollPendingBridge(item)
  );
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const requestedRef = useRef(new Set<string>());
  const requestQueueRef = useRef(
    new PQueue({ interval: 1000, intervalCap: 2, concurrency: 2 })
  );
  const itemsRef = useRef(items);
  const addressRef = useRef(address);
  const enabledRef = useRef(enabled);
  const initScanRef = useRef({ address: '', scanned: 0, matched: 0 });
  const generationRef = useRef(0);
  itemsRef.current = items;
  addressRef.current = address;
  enabledRef.current = enabled;

  /** 去重、按每秒最多 2 批发出 history_list_by_tx_ids。不决定查哪些交易。 */
  const enqueueIds = useCallback(
    (ids: string[]) => {
      const fresh: string[] = [];
      ids.forEach((id) => {
        const key = id.toLowerCase();
        if (!key || requestedRef.current.has(key)) return;
        requestedRef.current.add(key);
        fresh.push(id);
      });
      for (
        let index = 0;
        index < fresh.length;
        index += BRIDGE_HISTORY_TX_BATCH
      ) {
        const batch = fresh.slice(index, index + BRIDGE_HISTORY_TX_BATCH);
        const generation = generationRef.current;
        requestQueueRef.current.add(async () => {
          if (generation !== generationRef.current || !enabledRef.current) {
            return;
          }
          try {
            // 只用已有本地来源排除明确的 Send、Swap 和外部 dApp 交易，不新增标记。
            const { pendings, completeds } = await wallet.getTransactionHistory(
              addressRef.current
            );
            if (generation !== generationRef.current) return;
            const excludedIds = new Set(
              [...pendings, ...completeds].flatMap((group) => {
                const ga = group.$ctx?.ga;
                // 源链失败、退款、等待的跨链记录 source 仍是 bridge，不能排除。
                // 跨链本身可能带 swap 动作，只按 Rabby 发起时写入的 source 判断。
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
            if (!candidates.length) return;
            const res = await wallet.openapi.getBridgeHistoryListByTxIds({
              from_tx_ids: candidates,
            });
            if (generation !== generationRef.current) return;
            const list = res?.history_list || [];
            if (!list.length) return;
            setBridges((prev) => {
              const next = new Map(
                prev.map((item) => [
                  historyTxKey(item.from_token?.chain, item.from_tx?.tx_id),
                  item,
                ])
              );
              list.forEach((item) => {
                next.set(
                  historyTxKey(item.from_token?.chain, item.from_tx?.tx_id),
                  item
                );
              });
              return Array.from(next.values());
            });
          } catch {
            if (generation !== generationRef.current) return;
            batch.forEach((id) =>
              requestedRef.current.delete(id.toLowerCase())
            );
          }
        });
      }
    },
    [wallet]
  );

  /** 换地址或停用时清空队列和已查记录，避免把上一个地址的结果写进来。 */
  useEffect(() => {
    generationRef.current += 1;
    requestQueueRef.current.clear();
    requestedRef.current = new Set();
    initScanRef.current = { address: '', scanned: 0, matched: 0 };
    bridgesRef.current = [];
    setBridges([]);
    return () => {
      // 切换地址、停用或卸载后，丢掉还没开始的请求，进行中的结果也不再写入。
      generationRef.current += 1;
      requestQueueRef.current.clear();
    };
  }, [address, enabled]);

  /** 初始化：只扫本地历史前部，凑满一批候选或达到扫描上限就停。 */
  const scanInitialHistory = useCallback(() => {
    if (!enabled || !address || !items.length) return;
    const bootKey = address.toLowerCase();
    const belongsToAddress = items.some(
      (item) => item.owner_addr?.toLowerCase() === bootKey
    );
    if (!belongsToAddress) return;
    if (initScanRef.current.address !== bootKey) {
      initScanRef.current = { address: bootKey, scanned: 0, matched: 0 };
    }
    const state = initScanRef.current;
    if (
      state.matched >= BRIDGE_HISTORY_TX_BATCH ||
      state.scanned >= BRIDGE_HISTORY_INIT_SCAN_LIMIT
    ) {
      return;
    }
    const end = Math.min(items.length, BRIDGE_HISTORY_INIT_SCAN_LIMIT);
    if (state.scanned >= end) return;
    const { ids, scanned } = collectInitialBridgeTxIds(
      items,
      address,
      new Set(requestedRef.current),
      state.scanned
    );
    state.scanned = scanned;
    state.matched += ids.length;
    if (ids.length) enqueueIds(ids);
  }, [address, enabled, enqueueIds, items]);

  useEffect(() => {
    scanInitialHistory();
  }, [scanInitialHistory]);

  /** 轮询：不扫描历史列表，只重复查询当前仍在 pending 且创建未满 2h 的跨链。 */
  const pollPendingBridges = useCallback(() => {
    if (requestQueueRef.current.size || requestQueueRef.current.pending) {
      return;
    }
    const now = Date.now();
    const pendingIds = bridgesRef.current
      .filter((item) => shouldPollPendingBridge(item, now))
      .map((item) => item.from_tx?.tx_id)
      .filter((id): id is string => !!id);
    pendingIds.forEach((id) => requestedRef.current.delete(id.toLowerCase()));
    enqueueIds(pendingIds);
  }, [enqueueIds]);

  useEffect(() => {
    if (!enabled || !address || !hasPendingBridge) return;
    const timer = setInterval(pollPendingBridges, 3000);
    return () => clearInterval(timer);
  }, [address, enabled, hasPendingBridge, pollPendingBridges]);

  /** 滚动：把可见行映射回原始历史下标，只取所在的 20 条窗口。 */
  const onRangeChanged = useCallback(
    (
      startIndex: number,
      endIndex: number,
      rows: HistoryListRow<{ chain: string; id: string }>[]
    ) => {
      if (!enabledRef.current || !addressRef.current) return;
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
      const skip = new Set(requestedRef.current);
      enqueueIds(
        collectViewportOutgoingTxIds(
          items,
          addressRef.current,
          skip,
          start,
          end
        )
      );
    },
    [enqueueIds]
  );

  return { bridges, onRangeChanged };
};
