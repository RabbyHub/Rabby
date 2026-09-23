import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { formatEstimateClock } from './duration';

export const BRIDGE_PROGRESS_COUNTDOWN_MIN_SECONDS = 5;
export const BRIDGE_PROGRESS_DELAY_MS = 30 * 60 * 1000;

export type BridgeProgressStep =
  | 'sourceLoading'
  | 'queued'
  | 'destLoading'
  | 'destDelayed'
  | 'success'
  | 'destFailed'
  | 'sourceFailed'
  | 'undo';

export type BridgeProgressFooter =
  | { kind: 'none' }
  | { kind: 'countdown'; time: string }
  | { kind: 'stillBridging' }
  | { kind: 'delayed' }
  | { kind: 'sourceFailed' }
  | {
      kind: 'refund';
      isOriginalToken: boolean;
      txId?: string;
      chainServerId?: string;
    }
  | { kind: 'failedNoRefund' };

export type BridgeProgressBar = {
  step1: BridgeProgressStep;
  step2: BridgeProgressStep;
  footer: BridgeProgressFooter;
};

export type BridgePopupCaption =
  | { kind: 'estimate'; time: string }
  | { kind: 'stillBridging' }
  | { kind: 'delayed' }
  | { kind: 'sourceFailed' }
  | { kind: 'failed' }
  | { kind: 'refunded' }
  | { kind: 'none' };

export type BridgePopupButton =
  | 'back'
  | 'delayedSupport'
  | 'failedSupport'
  | 'refund';

export type BridgePopupStep =
  | 'processing'
  | 'queued'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refund';

export type BridgePopupState = {
  title: 'processing' | 'pending' | 'failed' | 'refunded' | 'completed';
  step1: BridgePopupStep;
  step2: BridgePopupStep;
  step3?: 'refund';
  caption: BridgePopupCaption;
  button: BridgePopupButton;
  refund?: {
    txId?: string;
    chainServerId?: string;
  };
};

const formatEta = (remainingSeconds: number) =>
  formatEstimateClock(remainingSeconds);

const refundDetails = (item: BridgeTxHistoryItem) => {
  const txId = item.toTxId;
  const chainServerId = item.actualToToken?.chain;
  if (!item.actualToToken?.id || !txId) return null;
  return { txId, chainServerId };
};

const sourceDoneProgress = (
  item: BridgeTxHistoryItem,
  now: number
): BridgeProgressBar => {
  const elapsedMs = item.fromTxCompleteTs
    ? Math.max(0, now - item.fromTxCompleteTs)
    : 0;

  if (item.fromTxCompleteTs && elapsedMs >= BRIDGE_PROGRESS_DELAY_MS) {
    return {
      step1: 'success',
      step2: 'destDelayed',
      footer: { kind: 'delayed' },
    };
  }

  const estimateSeconds = item.estimatedDuration || 0;
  const remainingSeconds = estimateSeconds - elapsedMs / 1000;
  if (
    estimateSeconds > BRIDGE_PROGRESS_COUNTDOWN_MIN_SECONDS &&
    remainingSeconds > 0
  ) {
    return {
      step1: 'success',
      step2: 'destLoading',
      footer: { kind: 'countdown', time: formatEta(remainingSeconds) },
    };
  }

  // A quote of 5s or less never shows a countdown. Hold the footer until 5s
  // after the source chain completes so "Still Bridging" does not flash.
  if (elapsedMs < BRIDGE_PROGRESS_COUNTDOWN_MIN_SECONDS * 1000) {
    return {
      step1: 'success',
      step2: 'destLoading',
      footer: { kind: 'none' },
    };
  }

  return {
    step1: 'success',
    step2: 'destLoading',
    footer: { kind: 'stillBridging' },
  };
};

const sourceElapsedMs = (item: BridgeTxHistoryItem, now: number) =>
  item.fromTxCompleteTs ? Math.max(0, now - item.fromTxCompleteTs) : 0;

/** Popup always shows the estimate. It does not hide a quote of 5 seconds or less. */
export const getBridgePopupState = (
  item: BridgeTxHistoryItem,
  now = Date.now()
): BridgePopupState => {
  if (item.status === 'fromFailed') {
    return {
      title: 'failed',
      step1: 'failed',
      step2: 'queued',
      caption: { kind: 'sourceFailed' },
      button: 'back',
    };
  }

  if (item.status === 'allSuccess') {
    return {
      title: 'completed',
      step1: 'completed',
      step2: 'completed',
      caption: { kind: 'none' },
      button: 'back',
    };
  }

  if (item.status === 'failed') {
    const refund = refundDetails(item);
    if (refund) {
      return {
        title: 'refunded',
        step1: 'completed',
        step2: 'failed',
        step3: 'refund',
        caption: { kind: 'refunded' },
        button: 'refund',
        refund,
      };
    }
    return {
      title: 'failed',
      step1: 'completed',
      step2: 'failed',
      caption: { kind: 'failed' },
      button: 'failedSupport',
    };
  }

  if (item.status === 'fromSuccess') {
    const elapsedMs = sourceElapsedMs(item, now);
    if (item.fromTxCompleteTs && elapsedMs >= BRIDGE_PROGRESS_DELAY_MS) {
      return {
        title: 'pending',
        step1: 'completed',
        step2: 'pending',
        caption: { kind: 'delayed' },
        button: 'delayedSupport',
      };
    }

    const estimateSeconds = item.estimatedDuration || 0;
    const remainingSeconds = estimateSeconds - elapsedMs / 1000;
    if (remainingSeconds > 0) {
      return {
        title: 'pending',
        step1: 'completed',
        step2: 'pending',
        caption: { kind: 'estimate', time: formatEta(remainingSeconds) },
        button: 'back',
      };
    }

    return {
      title: 'pending',
      step1: 'completed',
      step2: 'pending',
      caption: { kind: 'stillBridging' },
      button: 'back',
    };
  }

  return {
    title: 'processing',
    step1: 'processing',
    step2: 'queued',
    caption: {
      kind: 'estimate',
      time: formatEta(item.estimatedDuration || 0),
    },
    button: 'back',
  };
};

export const getBridgeProgressBar = (
  item: BridgeTxHistoryItem,
  now = Date.now()
): BridgeProgressBar => {
  if (item.status === 'fromFailed') {
    return {
      step1: 'sourceFailed',
      step2: 'undo',
      footer: { kind: 'sourceFailed' },
    };
  }

  if (item.status === 'allSuccess') {
    return {
      step1: 'success',
      step2: 'success',
      footer: { kind: 'none' },
    };
  }

  if (item.status === 'failed') {
    const refund = refundDetails(item);
    if (refund) {
      return {
        step1: 'success',
        step2: 'undo',
        footer: {
          kind: 'refund',
          isOriginalToken:
            item.actualToToken?.chain === item.fromToken.chain &&
            item.actualToToken?.id.toLowerCase() ===
              item.fromToken.id.toLowerCase(),
          txId: refund.txId,
          chainServerId: refund.chainServerId,
        },
      };
    }
    return {
      step1: 'success',
      step2: 'destFailed',
      footer: { kind: 'failedNoRefund' },
    };
  }

  if (item.status === 'fromSuccess') {
    return sourceDoneProgress(item, now);
  }

  return {
    step1: 'sourceLoading',
    step2: 'queued',
    footer: { kind: 'none' },
  };
};
