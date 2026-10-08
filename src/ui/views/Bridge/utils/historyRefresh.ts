import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';

export const bridgeTxIdKey = (id?: string) => (id || '').toLowerCase();

export const sameBridgeTxId = (left?: string, right?: string) => {
  const key = bridgeTxIdKey(left);
  return !!key && key === bridgeTxIdKey(right);
};

/** 只在记录或状态变化时重读本地跨链记录。 */
export const bridgeHistoryStatusKey = (
  list?: Pick<BridgeHistory, 'from_tx' | 'status'>[] | null
) =>
  (list || [])
    .map(
      (item) =>
        `${bridgeTxIdKey(item.from_tx?.tx_id)}:${item.status}:${
          item.from_tx?.status || ''
        }`
    )
    .join('|');

export const findLocalBridgeTx = <
  T extends { hash?: string; acceleratedHash?: string }
>(
  locals: T[],
  txId?: string
) =>
  locals.find(
    (item) =>
      sameBridgeTxId(item.hash, txId) ||
      sameBridgeTxId(item.acceleratedHash, txId)
  );
