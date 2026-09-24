import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ONE_DAY_MS, ONE_HOUR_MS } from '../constants';
import {
  bridgeRemoteFromTxStatus,
  bridgeRemoteSourceCompleteTs,
} from './remoteFromTx';

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
      status: 'allSuccess' | 'failed' | 'fromFailed';
      item: BridgeHistory;
      local: BridgeTxHistoryItem;
    }
  | {
      /** 整体仍 pending，但远程 from_tx 已推进到源链成功 / 失败。只更新 UI 本地态。 */
      kind: 'sync';
      local: BridgeTxHistoryItem;
    };

const withRemoteSourceComplete = (
  local: BridgeTxHistoryItem,
  item: BridgeHistory
): BridgeTxHistoryItem => {
  const remoteTs = bridgeRemoteSourceCompleteTs(item);
  if (!remoteTs) return local;
  return {
    ...local,
    fromTxCompleteTs: remoteTs,
  };
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

  const fromTxStatus = bridgeRemoteFromTxStatus(findTx);

  if (findTx.status === 'completed') {
    return {
      kind: 'complete',
      hash: local.hash,
      fromChainId: local.fromChainId,
      status: 'allSuccess',
      item: findTx,
      local: {
        ...withRemoteSourceComplete(local, findTx),
        status: 'allSuccess',
        actualToToken: findTx.to_actual_token,
        actualToAmount: findTx.actual.receive_token_amount,
        toTxId: findTx.to_tx?.tx_id,
        completedAt: now,
      },
    };
  }

  if (findTx.status === 'failed') {
    // 远程 from_tx.failed → 源链失败；否则视为目标链失败。
    const status = fromTxStatus === 'failed' ? 'fromFailed' : 'failed';
    return {
      kind: 'complete',
      hash: local.hash,
      fromChainId: local.fromChainId,
      status,
      item: findTx,
      local: {
        ...withRemoteSourceComplete(local, findTx),
        status,
        actualToToken: findTx.to_actual_token,
        actualToAmount: findTx.actual.receive_token_amount,
        toTxId: findTx.to_tx?.tx_id,
        completedAt: now,
      },
    };
  }

  if (findTx.status === 'pending') {
    if (fromTxStatus === 'failed') {
      return {
        kind: 'sync',
        local: {
          ...local,
          status: 'fromFailed',
        },
      };
    }
    if (fromTxStatus === 'success') {
      const remoteTs = bridgeRemoteSourceCompleteTs(findTx);
      return {
        kind: 'sync',
        local: {
          ...local,
          status: 'fromSuccess',
          fromTxCompleteTs: remoteTs || local.fromTxCompleteTs || now,
        },
      };
    }
    return { kind: 'pending' };
  }

  return { kind: 'keep' };
};
