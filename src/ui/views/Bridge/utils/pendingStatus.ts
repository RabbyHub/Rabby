import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ONE_DAY_MS, ONE_HOUR_MS } from '../constants';

export const BRIDGE_PENDING_HISTORY_QUERY = {
  start: 0,
  limit: 10,
  is_all: true,
} as const;

export const isBridgePendingExpired = (createdAt?: number, now = Date.now()) =>
  !!createdAt && now - createdAt > ONE_DAY_MS;

export type BridgePendingListResolution =
  | { kind: 'keep' }
  | { kind: 'pending' }
  | {
      kind: 'hide-failed';
      hash: string;
      fromChainId: number;
    }
  | {
      kind: 'complete';
      hash: string;
      fromChainId: number;
      status: 'allSuccess' | 'failed';
      item: BridgeHistory;
      local: BridgeTxHistoryItem;
    };

export const resolveBridgePendingFromHistoryList = (
  local: BridgeTxHistoryItem,
  list: BridgeHistory[] | undefined,
  now = Date.now()
): BridgePendingListResolution => {
  if (!list) {
    return { kind: 'keep' };
  }

  const matchHash = local.acceleratedHash || local.hash;
  const findTx = list.find((item) => item.from_tx?.tx_id === matchHash);

  if (!findTx) {
    if (now - local.createdAt > ONE_HOUR_MS) {
      return {
        kind: 'hide-failed',
        hash: local.hash,
        fromChainId: local.fromChainId,
      };
    }
    return { kind: 'keep' };
  }

  if (findTx.status === 'completed' || findTx.status === 'failed') {
    const status = findTx.status === 'completed' ? 'allSuccess' : 'failed';
    return {
      kind: 'complete',
      hash: local.hash,
      fromChainId: local.fromChainId,
      status,
      item: findTx,
      local: {
        ...local,
        status,
        actualToToken: findTx.to_actual_token,
        actualToAmount: findTx.actual.receive_token_amount,
        completedAt: now,
      },
    };
  }

  if (findTx.status === 'pending') {
    return { kind: 'pending' };
  }

  return { kind: 'keep' };
};
