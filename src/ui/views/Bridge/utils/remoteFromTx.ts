import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';

/** from_tx.time_at 与 create_at 一样是秒；兼容误传毫秒。 */
export const bridgeFromTxTimeMs = (timeAt?: number) => {
  if (!timeAt) return 0;
  return timeAt > 1e12 ? timeAt : timeAt * 1000;
};

/** 远程标明源链已成功时，用 from_tx.time_at 作为完成时间。 */
export const bridgeRemoteSourceCompleteTs = (
  data?: Pick<BridgeHistory, 'from_tx'> | null
) => {
  if (data?.from_tx?.status !== 'success') return 0;
  return bridgeFromTxTimeMs(data.from_tx.time_at);
};

export const bridgeRemoteFromTxStatus = (
  data?: Pick<BridgeHistory, 'from_tx'> | null
) => data?.from_tx?.status;
