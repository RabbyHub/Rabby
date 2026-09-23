import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';

export const BRIDGE_HISTORY_TX_BATCH = 20;

export const historyTxKey = (chain?: string, id?: string) =>
  `${(chain || '').toLowerCase()}:${(id || '').toLowerCase()}`;

type OutgoingHistoryTx = {
  id: string;
  tx?: { from_addr?: string } | null;
};

export const isOutgoingUserTx = (item: OutgoingHistoryTx, address: string) =>
  !!item.tx?.from_addr &&
  !!address &&
  item.tx.from_addr.toLowerCase() === address.toLowerCase();

const txIdKey = (id: string) => id.toLowerCase();

export const collectOutgoingTxIds = (
  items: OutgoingHistoryTx[],
  address: string,
  skip: Set<string>,
  limit = BRIDGE_HISTORY_TX_BATCH,
  startIndex = 0
) => {
  const ids: string[] = [];
  for (
    let index = Math.max(0, startIndex);
    index < items.length && ids.length < limit;
    index += 1
  ) {
    const item = items[index];
    if (!item?.id || !isOutgoingUserTx(item, address)) continue;
    const key = txIdKey(item.id);
    if (skip.has(key)) continue;
    skip.add(key);
    ids.push(item.id);
  }
  return ids;
};

export const collectViewportOutgoingTxIds = (
  items: OutgoingHistoryTx[],
  address: string,
  skip: Set<string>,
  startIndex: number,
  endIndex: number,
  limit = BRIDGE_HISTORY_TX_BATCH
) => {
  const ids: string[] = [];
  const take = (item?: OutgoingHistoryTx) => {
    if (!item?.id || !isOutgoingUserTx(item, address) || ids.length >= limit) {
      return;
    }
    const key = txIdKey(item.id);
    if (skip.has(key)) return;
    skip.add(key);
    ids.push(item.id);
  };

  const start = Math.max(0, startIndex);
  const end = Math.min(items.length - 1, endIndex);
  for (let index = start; index <= end; index += 1) {
    take(items[index]);
  }
  for (
    let index = end + 1;
    index < items.length && ids.length < limit;
    index += 1
  ) {
    take(items[index]);
  }
  return ids;
};

export type HistoryListRow<T> =
  | { kind: 'tx'; key: string; item: T }
  | { kind: 'bridge'; key: string; item: BridgeHistory };

const bridgeToChain = (bridge: BridgeHistory) =>
  bridge.to_actual_token?.chain || bridge.to_token?.chain;

export const mergeHistoryWithBridge = <
  T extends { chain: string; id: string; _id: string }
>(
  items: T[],
  bridges: BridgeHistory[]
): HistoryListRow<T>[] => {
  const present = new Set(
    items.map((item) => historyTxKey(item.chain, item.id))
  );
  const fromBridge = new Map<string, BridgeHistory>();
  const dropTo = new Set<string>();

  bridges.forEach((bridge) => {
    const fromId = bridge.from_tx?.tx_id;
    if (!fromId) return;
    const fromKey = historyTxKey(bridge.from_token?.chain, fromId);
    if (!present.has(fromKey)) return;
    fromBridge.set(fromKey, bridge);
    const toId = bridge.to_tx?.tx_id;
    if (!toId) return;
    const toKey = historyTxKey(bridgeToChain(bridge), toId);
    if (toKey !== fromKey && present.has(toKey)) {
      dropTo.add(toKey);
    }
  });

  const rows: HistoryListRow<T>[] = [];
  items.forEach((item) => {
    const key = historyTxKey(item.chain, item.id);
    if (dropTo.has(key)) return;
    const bridge = fromBridge.get(key);
    if (bridge) {
      rows.push({
        kind: 'bridge',
        key: `bridge:${key}`,
        item: bridge,
      });
      return;
    }
    rows.push({ kind: 'tx', key: item._id, item });
  });
  return rows;
};
