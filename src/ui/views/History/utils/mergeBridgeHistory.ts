import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { BRIDGE_HISTORY_POLL_MAX_AGE_MS } from '@/ui/views/Bridge/constants';
import { isSameAddress } from '@/ui/utils';

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

const isBridgeCandidate = (item: OutgoingHistoryTx, address: string) =>
  !!item.tx?.from_addr &&
  isSameAddress(item.tx.from_addr, address) &&
  !item.is_scam &&
  !['send', 'receive', 'approve', 'cancel'].includes(item.cate_id || '');

const txIdKey = (id: string) => id.toLowerCase();

/** 收集窗口内候选，不向外补齐。 */
export const collectOutgoingTxIds = (
  items: OutgoingHistoryTx[],
  address: string,
  skip: Set<string>,
  limit = BRIDGE_HISTORY_TX_BATCH,
  startIndex = 0
) => {
  const ids: string[] = [];
  const start = Math.max(0, startIndex);
  // 按原始条数分批，不跨批补齐。
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

/** 初始化：达到候选数、扫描上限或列表末尾即停止。 */
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

/** 收集可见范围所在批次的候选。 */
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
  // 批次按 0–19、20–39 对齐。
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

/** 认为失败，轮询没意义：create_at 起算未满 2h 的 pending 才继续轮询；缺少 create_at 无法判断时长，不轮询。 */
export const shouldPollPendingBridge = (
  item: BridgeHistory,
  now = Date.now()
) => {
  if (item.status !== 'pending' || !item.create_at) return false;
  return now - item.create_at * 1000 < BRIDGE_HISTORY_POLL_MAX_AGE_MS;
};
