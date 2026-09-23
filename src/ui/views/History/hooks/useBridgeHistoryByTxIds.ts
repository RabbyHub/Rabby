import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BRIDGE_HISTORY_TX_BATCH,
  HistoryListRow,
  collectOutgoingTxIds,
  collectViewportOutgoingTxIds,
  historyTxKey,
} from '../utils/mergeBridgeHistory';

type LookupItem = {
  id: string;
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
  const requestedRef = useRef(new Set<string>());
  const queuedRef = useRef(new Set<string>());
  const queueRef = useRef<string[]>([]);
  const inFlightRef = useRef(false);
  const itemsRef = useRef(items);
  const addressRef = useRef(address);
  const enabledRef = useRef(enabled);
  const bootstrappedRef = useRef('');
  const generationRef = useRef(0);
  itemsRef.current = items;
  addressRef.current = address;
  enabledRef.current = enabled;

  const flush = useCallback(() => {
    if (!enabledRef.current || inFlightRef.current) return;
    const batch = queueRef.current.splice(0, BRIDGE_HISTORY_TX_BATCH);
    batch.forEach((id) => queuedRef.current.delete(id.toLowerCase()));
    if (!batch.length) return;
    const generation = generationRef.current;
    inFlightRef.current = true;
    batch.forEach((id) => requestedRef.current.add(id.toLowerCase()));
    wallet.openapi
      .getBridgeHistoryListByTxIds({ from_tx_ids: batch })
      .then((res) => {
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
      })
      .catch(() => {
        if (generation !== generationRef.current) return;
        batch.forEach((id) => requestedRef.current.delete(id.toLowerCase()));
      })
      .finally(() => {
        if (generation !== generationRef.current) return;
        inFlightRef.current = false;
        flush();
      });
  }, [wallet]);

  const enqueueIds = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => {
        const key = id.toLowerCase();
        if (
          !key ||
          requestedRef.current.has(key) ||
          queuedRef.current.has(key)
        ) {
          return;
        }
        queuedRef.current.add(key);
        queueRef.current.push(id);
      });
      flush();
    },
    [flush]
  );

  useEffect(() => {
    generationRef.current += 1;
    requestedRef.current = new Set();
    queuedRef.current = new Set();
    queueRef.current = [];
    inFlightRef.current = false;
    bootstrappedRef.current = '';
    setBridges([]);
  }, [address]);

  useEffect(() => {
    if (!enabled || !address || !items.length) return;
    const bootKey = address.toLowerCase();
    const belongsToAddress = items.some(
      (item) => item.owner_addr?.toLowerCase() === bootKey
    );
    if (!belongsToAddress || bootstrappedRef.current === bootKey) return;
    bootstrappedRef.current = bootKey;
    const skip = new Set<string>([
      ...requestedRef.current,
      ...queuedRef.current,
    ]);
    enqueueIds(collectOutgoingTxIds(items, address, skip));
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
      const skip = new Set<string>([
        ...requestedRef.current,
        ...queuedRef.current,
      ]);
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
