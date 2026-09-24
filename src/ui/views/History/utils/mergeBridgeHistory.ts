import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { BRIDGE_HISTORY_POLL_MAX_AGE_MS } from '@/ui/views/Bridge/constants';

export const BRIDGE_HISTORY_TX_BATCH = 20;
export const BRIDGE_HISTORY_INIT_SCAN_LIMIT = 100;

export const historyTxKey = (chain?: string, id?: string) =>
  `${(chain || '').toLowerCase()}:${(id || '').toLowerCase()}`;

type OutgoingHistoryTx = {
  id: string;
  cate_id?: string | null;
  is_scam?: boolean;
  sends?: unknown[] | null;
  token_approve?: unknown;
  tx?: { from_addr?: string } | null;
};

const bridgeSkipReasons = (item: OutgoingHistoryTx, address: string) => {
  const reasons: string[] = [];
  if (!item.tx?.from_addr) reasons.push('缺少 tx.from_addr');
  else if (item.tx.from_addr.toLowerCase() !== address.toLowerCase()) {
    reasons.push('不是当前地址发出');
  }
  if (item.is_scam) reasons.push('scam 交易');
  if (!item.sends?.length) reasons.push('sends 为空');
  if (['send', 'receive', 'approve', 'cancel'].includes(item.cate_id || '')) {
    reasons.push(`分类是 ${item.cate_id}`);
  }
  return reasons;
};

// 明确的转账、收款和授权不是内部跨链；分类未知的保留查询兜底。
const isBridgeCandidate = (item: OutgoingHistoryTx, address: string) => {
  // 跨链记录也可能带 token_approve，不能据此认定为纯授权交易。
  return bridgeSkipReasons(item, address).length === 0;
};

const txIdKey = (id: string) => id.toLowerCase();

/** 滚动窗口内收集候选。只看这一段原始记录，被滤掉的不从窗口外补。 */
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

/** 初始化专用。向后找，直到凑满 matchLimit、扫过 scanLimit，或列表结束。 */
export const collectInitialBridgeTxIds = (
  items: OutgoingHistoryTx[],
  address: string,
  skip: Set<string>,
  startIndex = 0,
  matchLimit = BRIDGE_HISTORY_TX_BATCH,
  scanLimit = BRIDGE_HISTORY_INIT_SCAN_LIMIT
) => {
  const ids: string[] = [];
  let index = Math.max(0, startIndex);
  const end = Math.min(items.length, scanLimit);
  for (; index < end && ids.length < matchLimit; index += 1) {
    const item = items[index];
    if (!item?.id || !isBridgeCandidate(item, address)) continue;
    const key = txIdKey(item.id);
    if (skip.has(key)) continue;
    skip.add(key);
    ids.push(item.id);
  }
  return { ids, scanned: index };
};

/** 滚动专用。可见下标落到 0–19、20–39 这类窗口后，只收集这些窗口。 */
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

/** create_at 起算未满 2h 的 pending 才继续轮询。 */
export const shouldPollPendingBridge = (
  item: BridgeHistory,
  now = Date.now()
) => {
  if (item.status !== 'pending') return false;
  const createdAt = item.create_at ? item.create_at * 1000 : 0;
  if (!createdAt) return true;
  return now - createdAt < BRIDGE_HISTORY_POLL_MAX_AGE_MS;
};
