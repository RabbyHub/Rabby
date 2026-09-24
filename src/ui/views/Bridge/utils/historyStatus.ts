import type {
  BridgeHistory,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { formatEstimateClock } from './duration';
import { BRIDGE_PROGRESS_DELAY_MS } from './progressBar';
import {
  bridgeRemoteFromTxStatus,
  bridgeRemoteSourceCompleteTs,
} from './remoteFromTx';
import { BRIDGE_HISTORY_CREATE_AT_DELAY_MS } from '../constants';

/**
 * 交易历史展开后的业务场景。
 * 先由 resolveBridgeHistoryScene 判定场景，再由 buildHistoryDetail 转成界面数据。
 * 组件只渲染结果，不再自己判断超时或退款种类。
 *
 * 判定顺序（有远程 from_tx 时以远程为准）：
 * 1. 目标链成功
 * 2. 源链失败（from_tx.failed）
 * 3. 目标链失败（有退款 / 无退款）
 * 4. 源链进行中（from_tx.pending）
 * 5. 源链已成功，目标链等待（倒计时 / Still Bridging / 延迟；完成时间优先 from_tx.time_at）
 */
export type BridgeHistoryScene =
  | 'sourcePending'
  | 'destCountdown'
  | 'destStillBridging'
  | 'destDelayed'
  | 'succeeded'
  | 'sourceFailed'
  | 'refundOriginal'
  | 'refundOther'
  | 'failedNoRefund';

export type BridgeHistoryDetailHeader =
  | 'processing'
  | 'pending'
  | 'succeeded'
  | 'refund'
  | 'failed';

export type BridgeHistoryDetailAction =
  | { kind: 'none' }
  | { kind: 'countdown'; time: string }
  | { kind: 'stillBridging' }
  | { kind: 'delayed' }
  | { kind: 'support' }
  | {
      kind: 'details';
      refundInSymbol?: string;
      txId?: string;
      chainServerId?: string;
    };

export type BridgeHistoryDetailStep = {
  mark: 'active' | 'waiting' | 'success' | 'failed';
  chainServerId?: string;
  direction: 'send' | 'receive';
  detail:
    | { kind: 'hash'; txId: string }
    | { kind: 'waiting' }
    | { kind: 'sendFailed' }
    | { kind: 'bridgeFailed' }
    | { kind: 'tokenNotSent' };
  amount: number;
  approx: boolean;
  sign: '-' | '+';
  token?: TokenItem;
  status: 'processing' | 'queued' | 'completed' | 'failed' | 'refund';
};

export type BridgeHistoryDetail = {
  scene: BridgeHistoryScene;
  header: BridgeHistoryDetailHeader;
  action: BridgeHistoryDetailAction;
  steps: BridgeHistoryDetailStep[];
};

type DestWaitingScene = Extract<
  BridgeHistoryScene,
  'destCountdown' | 'destStillBridging' | 'destDelayed'
>;

const tokenSymbol = (token?: TokenItem | null) =>
  token?.display_symbol || token?.symbol || token?.optimized_symbol || '';

const amountOrFallback = (actual?: number, fallback?: number) =>
  actual ?? fallback ?? 0;

const payAmountOf = (data: BridgeHistory) =>
  amountOrFallback(data.actual?.pay_token_amount, data.quote?.pay_token_amount);

const quoteReceiveOf = (data: BridgeHistory) =>
  data.quote?.receive_token_amount || 0;

const sourceTxIdOf = (data: BridgeHistory, local?: BridgeTxHistoryItem) =>
  data.from_tx?.tx_id || local?.acceleratedHash || local?.hash || '';

const refundTokenOf = (data: BridgeHistory, local?: BridgeTxHistoryItem) =>
  data.to_actual_token?.id ? data.to_actual_token : local?.actualToToken;

const refundTxIdOf = (data: BridgeHistory, local?: BridgeTxHistoryItem) =>
  data.to_tx?.tx_id || local?.toTxId;

/** 同链且同 token id 才算退回源链原代币，大小写不区分。 */
const isOriginalRefundToken = (
  from?: TokenItem | null,
  actual?: TokenItem | null
) =>
  !!from?.id &&
  !!actual?.id &&
  from.chain === actual.chain &&
  from.id.toLowerCase() === actual.id.toLowerCase();

/** 源链完成时间：远程 from_tx.time_at 优先，否则本地 fromTxCompleteTs。 */
const sourceCompleteTsOf = (data: BridgeHistory, local?: BridgeTxHistoryItem) =>
  bridgeRemoteSourceCompleteTs(data) || local?.fromTxCompleteTs || 0;

/** 源链已完成：绿勾、支付金额、来源交易。 */
const sendCompletedStep = (
  data: BridgeHistory,
  local?: BridgeTxHistoryItem
): BridgeHistoryDetailStep => ({
  mark: 'success',
  chainServerId: data.from_token?.chain,
  direction: 'send',
  detail: { kind: 'hash', txId: sourceTxIdOf(data, local) },
  amount: payAmountOf(data),
  approx: false,
  sign: '-',
  token: data.from_token,
  status: 'completed',
});

/** 目标链进行中：蓝色数字。延迟时这里也不改成橙色。 */
const receiveProcessingStep = (
  data: BridgeHistory
): BridgeHistoryDetailStep => ({
  mark: 'active',
  chainServerId: data.to_token?.chain,
  direction: 'receive',
  detail: { kind: 'waiting' },
  amount: quoteReceiveOf(data),
  approx: true,
  sign: '+',
  token: data.to_token,
  status: 'processing',
});

/** 目标链失败：红标，金额仍是预计到账。 */
const receiveFailedStep = (data: BridgeHistory): BridgeHistoryDetailStep => ({
  mark: 'failed',
  chainServerId: data.to_token?.chain,
  direction: 'receive',
  detail: { kind: 'bridgeFailed' },
  amount: quoteReceiveOf(data),
  approx: true,
  sign: '+',
  token: data.to_token,
  status: 'failed',
});

const receiveSuccessStep = (
  token: TokenItem | undefined,
  txId: string,
  amount: number
): BridgeHistoryDetailStep => ({
  mark: 'success',
  chainServerId: token?.chain,
  direction: 'receive',
  detail: { kind: 'hash', txId },
  amount,
  approx: false,
  sign: '+',
  token,
  status: 'completed',
});

/**
 * 目标链等待的三种标题。
 * 延迟优先从源链完成时间起算（远程 from_tx.time_at / 本地 fromTxCompleteTs）。
 * 没有完成时间时，用 create_at 满 2 小时进 Delayed / Contact Support。
 * 否则倒计时可用创建时间。
 */
const destWaitingScene = (
  data: BridgeHistory,
  local: BridgeTxHistoryItem | undefined,
  now: number
): DestWaitingScene => {
  const completeTs = sourceCompleteTsOf(data, local);
  if (completeTs && now - completeTs >= BRIDGE_PROGRESS_DELAY_MS) {
    return 'destDelayed';
  }

  // 没有源链完成时间时，create_at 满 2h 也进 Delayed / Contact Support。
  if (
    !completeTs &&
    data.create_at &&
    now - data.create_at * 1000 >= BRIDGE_HISTORY_CREATE_AT_DELAY_MS
  ) {
    return 'destDelayed';
  }

  const countdownStart =
    completeTs || (data.create_at ? data.create_at * 1000 : 0);
  const elapsedMs = countdownStart ? Math.max(0, now - countdownStart) : 0;
  const remainingSeconds = (local?.estimatedDuration || 0) - elapsedMs / 1000;
  if (remainingSeconds > 0) return 'destCountdown';
  return 'destStillBridging';
};

const isSourceFailed = (data: BridgeHistory, local?: BridgeTxHistoryItem) => {
  const fromTxStatus = bridgeRemoteFromTxStatus(data);
  if (fromTxStatus === 'failed') return true;
  // 旧接口没有 from_tx.status 时，仍用本地 fromFailed 兜底。
  if (!fromTxStatus && local?.status === 'fromFailed') return true;
  return false;
};

/**
 * 把接口状态和本地状态收成一个场景。
 * 有远程 from_tx.status / time_at 时以远程为准；否则回退本地。
 */
export const resolveBridgeHistoryScene = (
  data: BridgeHistory,
  local?: BridgeTxHistoryItem,
  now = Date.now()
): BridgeHistoryScene => {
  if (data.status === 'completed') {
    return 'succeeded';
  }

  if (isSourceFailed(data, local)) {
    return 'sourceFailed';
  }

  if (data.status === 'failed') {
    const token = refundTokenOf(data, local);
    const txId = refundTxIdOf(data, local);
    if (!token?.id || !txId) return 'failedNoRefund';
    return isOriginalRefundToken(data.from_token, token)
      ? 'refundOriginal'
      : 'refundOther';
  }

  if (data.status === 'pending') {
    const fromTxStatus = bridgeRemoteFromTxStatus(data);
    if (fromTxStatus === 'pending') {
      return 'sourcePending';
    }
    if (fromTxStatus === 'success') {
      return destWaitingScene(data, local, now);
    }
    // 旧接口：没有 from_tx.status 时，仅用本地区分等待阶段。
    if (local?.status !== 'pending') {
      return destWaitingScene(data, local, now);
    }
  }

  // 源链进行中不看创建时间，超过 30 分钟也不改成 Pending。
  return 'sourcePending';
};

const countdownTime = (
  data: BridgeHistory,
  local: BridgeTxHistoryItem | undefined,
  now: number
) => {
  const countdownStart =
    sourceCompleteTsOf(data, local) ||
    (data.create_at ? data.create_at * 1000 : 0);
  const elapsedMs = countdownStart ? Math.max(0, now - countdownStart) : 0;
  const remainingSeconds = (local?.estimatedDuration || 0) - elapsedMs / 1000;
  return formatEstimateClock(remainingSeconds, true);
};

const refundDetail = (
  scene: 'refundOriginal' | 'refundOther',
  data: BridgeHistory,
  local?: BridgeTxHistoryItem
): BridgeHistoryDetail => {
  const token = refundTokenOf(data, local);
  const txId = refundTxIdOf(data, local) || '';
  return {
    scene,
    header: 'refund',
    action: {
      kind: 'details',
      ...(scene === 'refundOther'
        ? { refundInSymbol: tokenSymbol(token) }
        : {}),
      txId,
      chainServerId: token?.chain,
    },
    steps: [
      sendCompletedStep(data, local),
      receiveFailedStep(data),
      receiveSuccessStep(
        token,
        txId,
        amountOrFallback(
          data.actual?.receive_token_amount,
          local?.actualToAmount
        )
      ),
    ],
  };
};

/** 按场景组装标题、右侧操作和步骤。同一步骤在不同场景里复用。 */
const buildHistoryDetail = (
  scene: BridgeHistoryScene,
  data: BridgeHistory,
  local: BridgeTxHistoryItem | undefined,
  now: number
): BridgeHistoryDetail => {
  switch (scene) {
    case 'sourcePending':
      return {
        scene,
        header: 'processing',
        action: { kind: 'none' },
        steps: [
          {
            mark: 'active',
            chainServerId: data.from_token?.chain,
            direction: 'send',
            detail: { kind: 'hash', txId: sourceTxIdOf(data, local) },
            amount: payAmountOf(data),
            approx: false,
            sign: '-',
            token: data.from_token,
            status: 'processing',
          },
          {
            mark: 'waiting',
            chainServerId: data.to_token?.chain,
            direction: 'receive',
            detail: { kind: 'waiting' },
            amount: quoteReceiveOf(data),
            approx: true,
            sign: '+',
            token: data.to_token,
            status: 'queued',
          },
        ],
      };
    case 'destCountdown':
      return {
        scene,
        header: 'processing',
        action: { kind: 'countdown', time: countdownTime(data, local, now) },
        steps: [sendCompletedStep(data, local), receiveProcessingStep(data)],
      };
    case 'destStillBridging':
      return {
        scene,
        header: 'processing',
        action: { kind: 'stillBridging' },
        steps: [sendCompletedStep(data, local), receiveProcessingStep(data)],
      };
    case 'destDelayed':
      return {
        scene,
        header: 'pending',
        action: { kind: 'delayed' },
        steps: [sendCompletedStep(data, local), receiveProcessingStep(data)],
      };
    case 'succeeded': {
      const token = data.to_actual_token?.id
        ? data.to_actual_token
        : data.to_token;
      return {
        scene,
        header: 'succeeded',
        action: { kind: 'none' },
        steps: [
          sendCompletedStep(data, local),
          receiveSuccessStep(
            token,
            data.to_tx?.tx_id || local?.toTxId || '',
            amountOrFallback(
              data.actual?.receive_token_amount,
              data.quote?.receive_token_amount
            )
          ),
        ],
      };
    }
    case 'sourceFailed': {
      const payAmount = payAmountOf(data);
      const chain = data.from_token?.chain || local?.fromToken?.chain;
      return {
        scene,
        header: 'refund',
        action: {
          kind: 'details',
          txId: sourceTxIdOf(data, local),
          chainServerId: chain,
        },
        steps: [
          {
            mark: 'failed',
            chainServerId: data.from_token?.chain,
            direction: 'send',
            detail: { kind: 'sendFailed' },
            amount: payAmount,
            approx: false,
            sign: '-',
            token: data.from_token,
            status: 'failed',
          },
          {
            mark: 'success',
            chainServerId: chain,
            direction: 'receive',
            detail: { kind: 'tokenNotSent' },
            amount: payAmount,
            approx: false,
            sign: '+',
            token: data.from_token || local?.fromToken,
            status: 'refund',
          },
        ],
      };
    }
    case 'refundOriginal':
    case 'refundOther':
      return refundDetail(scene, data, local);
    case 'failedNoRefund':
      return {
        scene,
        header: 'failed',
        action: { kind: 'support' },
        steps: [sendCompletedStep(data, local), receiveFailedStep(data)],
      };
    default: {
      const unreachable: never = scene;
      return unreachable;
    }
  }
};

/** 倒计时、Still Bridging 和延迟会随时间变化，需要刷新。源链进行中不刷新成 Pending。 */
export const bridgeHistoryDetailIsLive = (scene: BridgeHistoryScene) =>
  scene === 'destCountdown' ||
  scene === 'destStillBridging' ||
  scene === 'destDelayed';

export const getBridgeHistoryDetail = (
  data: BridgeHistory,
  local?: BridgeTxHistoryItem,
  now = Date.now()
): BridgeHistoryDetail =>
  buildHistoryDetail(
    resolveBridgeHistoryScene(data, local, now),
    data,
    local,
    now
  );
