import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';

/** 仅合并源链状态：已确认优先，双方确认时远程优先。 */
export const mergeBridgeSourceStatus = (
  data: BridgeHistory,
  local?: BridgeTxHistoryItem
): BridgeHistory => {
  if (
    (data.from_tx?.status && data.from_tx.status !== 'pending') ||
    (local?.status !== 'fromSuccess' && local?.status !== 'fromFailed')
  ) {
    return data;
  }
  const failed = local.status === 'fromFailed';
  return {
    ...data,
    from_tx: {
      ...data.from_tx,
      status: failed ? 'failed' : 'success',
    },
  };
};

/** from_tx.time_at 与 create_at 一样是秒。 */
export const bridgeFromTxTimeMs = (timeAt?: number) => {
  if (!timeAt) return 0;
  return timeAt * 1000;
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
