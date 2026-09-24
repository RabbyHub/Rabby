import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import PQueue from 'p-queue';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BRIDGE_HISTORY_TX_BATCH,
  HistoryListRow,
  collectOutgoingTxIds,
  collectViewportOutgoingTxIds,
  historyTxKey,
  logBridgeLookup,
} from '../utils/mergeBridgeHistory';

type LookupItem = {
  id: string;
  cate_id?: string | null;
  is_scam?: boolean;
  token_approve?: unknown;
  chain: string;
  owner_addr?: string;
  tx?: { from_addr?: string } | null;
};

export const useBridgeHistoryByTxIds = (options: {
  enabled: boolean;
  address?: string;
  items: LookupItem[];
}) => {
  const { enabled, address = '', items } = options;
  const wallet = useWallet();
  const [bridges, setBridges] = useState<BridgeHistory[]>([]);
  const hasPendingBridge = bridges.some((item) => item.status === 'pending');
  const bridgesRef = useRef(bridges);
  bridgesRef.current = bridges;
  const requestedRef = useRef(new Set<string>());
  const requestQueueRef = useRef(
    new PQueue({ interval: 1000, intervalCap: 2, concurrency: 2 })
  );
  const itemsRef = useRef(items);
  const addressRef = useRef(address);
  const enabledRef = useRef(enabled);
  const bootstrappedRef = useRef('');
  const generationRef = useRef(0);
  itemsRef.current = items;
  addressRef.current = address;
  enabledRef.current = enabled;

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
                // Bridge 自身可能包含兑换，不能按链上解析出的 swap 动作排除。
                const isNonBridgeFlow =
                  ga?.category === 'Send' ||
                  ga?.source === 'sendToken' ||
                  ga?.category === 'Swap' ||
                  ga?.source === 'swap';
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
            batch.forEach((id) => {
              const matches = [...pendings, ...completeds].flatMap((group) =>
                group.txs
                  .filter((tx) => tx.hash?.toLowerCase() === id.toLowerCase())
                  .map((tx) => ({
                    chainId: group.chainId,
                    category: group.$ctx?.ga?.category,
                    source: group.$ctx?.ga?.source,
                    origin: tx.site?.origin,
                    internalOrigin: INTERNAL_REQUEST_ORIGIN,
                  }))
              );
              logBridgeLookup(id, 'local-filter', {
                matches,
                excluded: excludedIds.has(id.toLowerCase()),
              });
            });
            if (!candidates.length) return;
            const res = await wallet.openapi.getBridgeHistoryListByTxIds({
              from_tx_ids: candidates,
            });
            if (generation !== generationRef.current) return;
            const list = res?.history_list || [];
            batch.forEach((id) =>
              logBridgeLookup(id, 'response', {
                returned: !!res,
                match: list.find(
                  (item) =>
                    item.from_tx?.tx_id?.toLowerCase() === id.toLowerCase()
                ),
              })
            );
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

  useEffect(() => {
    generationRef.current += 1;
    requestQueueRef.current.clear();
    requestedRef.current = new Set();
    bootstrappedRef.current = '';
    bridgesRef.current = [];
    setBridges([]);
    return () => {
      // 切换地址、停用或卸载后，丢掉还没开始的请求，进行中的结果也不再写入。
      generationRef.current += 1;
      requestQueueRef.current.clear();
    };
  }, [address, enabled]);

  useEffect(() => {
    // enabled 与 DB 历史使用相同的地址条件，非 core 地址不启动轮询。
    if (!enabled || !address || !hasPendingBridge) return;
    const timer = setInterval(() => {
      // 队列里还有未完成的查询时不追加轮询，避免请求堆积。
      if (requestQueueRef.current.size || requestQueueRef.current.pending) {
        return;
      }
      const pendingIds = bridgesRef.current
        .filter((item) => item.status === 'pending')
        .map((item) => item.from_tx?.tx_id)
        .filter((id): id is string => !!id);
      pendingIds.forEach((id) => requestedRef.current.delete(id.toLowerCase()));
      enqueueIds(pendingIds);
    }, 3000);
    return () => clearInterval(timer);
  }, [address, enabled, enqueueIds, hasPendingBridge]);

  useEffect(() => {
    if (!enabled || !address || !items.length) return;
    const bootKey = address.toLowerCase();
    const belongsToAddress = items.some(
      (item) => item.owner_addr?.toLowerCase() === bootKey
    );
    if (!belongsToAddress || bootstrappedRef.current === bootKey) return;
    bootstrappedRef.current = bootKey;
    enqueueIds(
      collectOutgoingTxIds(items, address, new Set(requestedRef.current))
    );
  }, [address, enabled, enqueueIds, items]);

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
