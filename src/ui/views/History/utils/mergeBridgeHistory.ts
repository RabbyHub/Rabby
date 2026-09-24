import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';

export const BRIDGE_HISTORY_TX_BATCH = 20;

// 临时定向排查，只输出这笔交易的分类和过滤原因。
export const logBridgeLookup = (id: string, stage: string, detail: unknown) => {
  if (
    id.toLowerCase() ===
    '0x5cf7c88eaebd3358288247bb320a141fe8ebfb6b189987feac8a12bd9a0c6488'
  ) {
    console.log('[BridgeLookup]', stage, id, detail);
  }
};

export const historyTxKey = (chain?: string, id?: string) =>
  `${(chain || '').toLowerCase()}:${(id || '').toLowerCase()}`;

type OutgoingHistoryTx = {
  id: string;
  cate_id?: string | null;
  is_scam?: boolean;
  token_approve?: unknown;
  tx?: { from_addr?: string } | null;
};

export const isOutgoingUserTx = (item: OutgoingHistoryTx, address: string) =>
  !!item.tx?.from_addr &&
  !!address &&
  item.tx.from_addr.toLowerCase() === address.toLowerCase();

// 明确的转账、收款和授权不是内部跨链；分类未知的保留查询兜底。
const isBridgeCandidate = (item: OutgoingHistoryTx, address: string) => {
  const outgoing = isOutgoingUserTx(item, address);
  const excludedCategory = ['send', 'receive', 'approve'].includes(
    item.cate_id || ''
  );
  logBridgeLookup(item.id, 'classification', {
    cate_id: item.cate_id,
    is_scam: !!item.is_scam,
    from_addr: item.tx?.from_addr,
    address,
    outgoing,
    excludedCategory,
    hasTokenApprove: !!item.token_approve,
    eligible: outgoing && !excludedCategory && !item.is_scam,
  });
  // 跨链记录也可能带 token_approve，不能据此认定为纯授权交易。
  return outgoing && !excludedCategory && !item.is_scam;
};

const txIdKey = (id: string) => id.toLowerCase();

export const collectOutgoingTxIds = (
  items: OutgoingHistoryTx[],
  address: string,
  skip: Set<string>,
  limit = BRIDGE_HISTORY_TX_BATCH,
  startIndex = 0
) => {
  const ids: string[] = [];
  const start = Math.max(0, startIndex);
  // 按原始历史条数限定批次，过滤掉的记录不从下一批补齐。
  const end = Math.min(items.length, start + limit);
  for (let index = start; index < end; index += 1) {
    const item = items[index];
    if (!item?.id || !isBridgeCandidate(item, address)) continue;
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
  if (limit <= 0) return [];
  const ids: string[] = [];
  // 只查询可见记录所在的批次：0–19、20–39……，不向更早历史补候选。
  const start = Math.floor(Math.max(0, startIndex) / limit) * limit;
  const end = Math.min(items.length - 1, endIndex);
  for (let index = start; index <= end; index += limit) {
    ids.push(...collectOutgoingTxIds(items, address, skip, limit, index));
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
