import { openBridgeSupport } from '../utils/support';
import React, { useState } from 'react';
import { useInterval } from 'ahooks';
import clsx from 'clsx';
import type {
  BridgeHistory,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ReactComponent as RcIconHistoryBack } from '@/ui/assets/bridge/IconHistoryBackCC.svg';
import { ReactComponent as RcIconHistoryQueued } from '@/ui/assets/bridge/IconHistoryQueued.svg';
import { ReactComponent as RcIconHistoryStepDone } from '@/ui/assets/bridge/IconHistoryStepDone.svg';
import { ReactComponent as RcIconHistoryStepFailed } from '@/ui/assets/bridge/IconHistoryStepFailed.svg';
import { ReactComponent as RcIconHistoryWarning } from '@/ui/assets/bridge/IconHistoryWarningCC.svg';
import { ReactComponent as RcIconSelectCC } from '@/ui/assets/bridge/IconSelectCC.svg';
import { ReactComponent as RcIconUndoCC } from '@/ui/assets/bridge/IconUndoCC.svg';
import { RcIconJumpBoldCC } from '@/ui/assets/dashboard';
import { SvgIcPending } from 'ui/assets';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { formatAmount, getUiType, openInTab } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChain } from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import { getBridgeRefundHref } from '../utils/refundLink';
import {
  BridgeHistoryDetail,
  BridgeHistoryDetailStep,
  bridgeHistoryDetailIsLive,
  getBridgeHistoryDetail,
} from '../utils/historyStatus';

/** 只渲染 historyStatus 给出的场景，这里不再判断超时或退款种类。 */
const isTab = getUiType().isTab;
const SPIN_STYLE = { animation: 'spin 1.5s linear infinite' };

const StatusChevron = ({ expanded }: { expanded: boolean }) => (
  <span className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center text-r-neutral-foot">
    <span className={clsx('inline-flex', !expanded && 'rotate-180')}>
      <RcIconHistoryBack className="block h-[14px] w-[14px] rotate-90" />
    </span>
  </span>
);

const HeaderIcon = ({ header }: { header: BridgeHistoryDetail['header'] }) => {
  if (header === 'succeeded') {
    return (
      <RcIconSelectCC className="block h-[16px] w-[16px] text-r-green-default" />
    );
  }
  if (header === 'failed') {
    return (
      <RcIconHistoryWarning className="block h-[16px] w-[16px] text-r-red-default" />
    );
  }
  if (header === 'refund') {
    return (
      <RcIconUndoCC className="block h-[16px] w-[16px] -scale-y-100 rotate-180 text-r-neutral-body" />
    );
  }
  return (
    <SvgIcPending
      className={clsx(
        'block h-[16px] w-[16px] animate-spin [&_path]:stroke-current',
        header === 'pending' ? 'text-r-orange-default' : 'text-r-blue-default'
      )}
      style={SPIN_STYLE}
    />
  );
};

const headerTone = {
  processing: 'text-r-blue-default',
  pending: 'text-r-orange-default',
  succeeded: 'text-r-green-default',
  refund: 'text-r-neutral-body',
  failed: 'text-r-red-default',
} as const;

const StepMark = ({
  step,
  index,
}: {
  step: BridgeHistoryDetailStep;
  index: number;
}) => {
  if (step.mark === 'success') {
    return <RcIconHistoryStepDone className="block shrink-0" />;
  }
  if (step.mark === 'failed') {
    return <RcIconHistoryStepFailed className="block shrink-0" />;
  }
  return (
    <span
      className={clsx(
        'flex h-[20px] w-[20px] items-center justify-center rounded-full text-[10px] leading-none',
        step.mark === 'active'
          ? 'bg-r-blue-default font-black text-white shadow-[0px_0.833px_0px_rgba(0,0,0,0.08)]'
          : 'border-[1.667px] border-solid border-r-neutral-line bg-r-neutral-bg1 font-extrabold text-r-neutral-foot'
      )}
    >
      {index}
    </span>
  );
};

/** 点击打开代币详情。通用历史卡片的 symbol 始终有下划线；Bridge 弹窗上半部分没有。 */
export const BridgeHistoryTokenSymbol = ({
  token,
  className,
  underline = true,
}: {
  token?: TokenItem;
  className?: string;
  underline?: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  if (!token) return null;
  return (
    <>
      <span
        className={clsx('cursor-pointer', underline && 'underline', className)}
        onClick={(event) => {
          event.stopPropagation();
          setVisible(true);
        }}
      >
        {getTokenSymbol(token)}
      </span>
      <TokenDetailPopup
        variant="add"
        visible={visible}
        onClose={() => setVisible(false)}
        token={token}
      />
    </>
  );
};

const TxLink = ({
  txId,
  chainServerId,
}: {
  txId: string;
  chainServerId?: string;
}) => {
  const href = getBridgeRefundHref(txId, chainServerId);
  if (!txId) return null;
  return (
    <button
      type="button"
      className="inline-flex h-[14px] items-center gap-[4px] bg-transparent p-0 text-[12px] leading-[14px] text-r-neutral-foot"
      onClick={(event) => {
        event.stopPropagation();
        if (href) openInTab(href, !isTab);
      }}
    >
      <span className="underline">
        {txId.length > 12 ? `${txId.slice(0, 6)}…${txId.slice(-4)}` : txId}
      </span>
      <RcIconJumpBoldCC width={12} height={12} className="block" />
    </button>
  );
};

const StepDetail = ({ step }: { step: BridgeHistoryDetailStep }) => {
  const { t } = useTranslation();
  if (step.detail.kind === 'hash') {
    return (
      <TxLink txId={step.detail.txId} chainServerId={step.chainServerId} />
    );
  }
  const text = {
    waiting: t('page.bridge.pendingItem.waitingDestination'),
    sendFailed: t('page.bridge.pendingItem.sendFailed'),
    bridgeFailed: t('page.bridge.pendingItem.popupBridgeFailed'),
    tokenNotSent: t('page.bridge.pendingItem.tokenNotSent', {
      token: getTokenSymbol(step.token),
    }),
  }[step.detail.kind];
  return (
    <span className="h-[14px] whitespace-nowrap text-[12px] leading-[14px] text-r-neutral-foot">
      {text}
    </span>
  );
};

const statusTone = {
  processing: 'text-r-blue-default',
  queued: 'text-r-neutral-foot',
  completed: 'text-r-green-default',
  failed: 'text-r-red-default',
  refund: 'text-r-neutral-body',
} as const;

const StepStatus = ({ step }: { step: BridgeHistoryDetailStep }) => {
  const { t } = useTranslation();
  const label = {
    processing: t('page.bridge.pendingItem.processing'),
    queued: t('page.bridge.pendingItem.queued'),
    completed: t('page.bridge.pendingItem.completed'),
    failed: t('page.bridge.pendingItem.failed'),
    refund: t('page.bridge.pendingItem.refund'),
  }[step.status];
  return (
    <span
      className={clsx(
        'inline-flex h-[14px] items-center gap-[4px] text-[12px] leading-[14px]',
        statusTone[step.status]
      )}
    >
      {step.status === 'queued' && (
        <RcIconHistoryQueued className="block shrink-0" />
      )}
      {label}
    </span>
  );
};

const HistoryStep = ({
  step,
  index,
  isLast,
}: {
  step: BridgeHistoryDetailStep;
  index: number;
  isLast: boolean;
}) => {
  const { t } = useTranslation();
  const chainName =
    findChain({ serverId: step.chainServerId })?.name ||
    step.chainServerId ||
    '';
  const title = t(
    step.direction === 'send'
      ? 'page.bridge.pendingItem.sendFrom'
      : 'page.bridge.pendingItem.receiveOn',
    { chain: chainName }
  );
  return (
    <div className="flex items-center justify-between gap-[8px]">
      <div className="flex min-w-0 items-center gap-[8px]">
        <div className="relative flex w-[20px] shrink-0 items-center justify-center self-stretch">
          <StepMark step={step} index={index} />
          {!isLast && (
            <div className="absolute left-1/2 top-full h-[22px] w-px -translate-x-1/2 bg-r-neutral-line" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-[4px]">
          <span className="h-[16px] whitespace-nowrap text-[13px] leading-[16px] text-r-neutral-title-1">
            {title}
          </span>
          <StepDetail step={step} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-[4px]">
        <span className="h-[16px] whitespace-nowrap text-[13px] leading-[16px] text-r-neutral-title-1">
          {step.sign}
          {step.approx ? '≈' : ''}
          {formatAmount(step.amount || 0)}{' '}
          <BridgeHistoryTokenSymbol token={step.token} />
        </span>
        <StepStatus step={step} />
      </div>
    </div>
  );
};

const HeaderAction = ({ detail }: { detail: BridgeHistoryDetail }) => {
  const { t } = useTranslation();
  const { action } = detail;
  if (action.kind === 'countdown') {
    return (
      <span className="h-[16px] text-[13px] leading-[16px] text-r-neutral-body">
        {t('page.bridge.timeLeft', { time: action.time })}
      </span>
    );
  }
  if (action.kind === 'stillBridging') {
    return (
      <span className="h-[14px] text-[12px] leading-[14px] text-r-neutral-body">
        {t('page.bridge.pendingItem.stillBridging')}
      </span>
    );
  }
  if (action.kind === 'delayed') {
    return (
      <span className="inline-flex h-[14px] items-center text-[12px] leading-[14px] text-r-neutral-body">
        {t('page.bridge.pendingItem.popupBridgeDelayed')}
        {', '}
        <button
          type="button"
          className="inline bg-transparent p-0 text-[12px] leading-[14px] text-r-blue-default underline"
          onClick={(event) => {
            event.stopPropagation();
            openBridgeSupport();
          }}
        >
          {t('page.bridge.pendingItem.contactSupport')}
        </button>
      </span>
    );
  }
  if (action.kind === 'support') {
    return (
      <button
        type="button"
        className="h-[14px] bg-transparent p-0 text-[12px] leading-[14px] text-r-blue-default underline"
        onClick={(event) => {
          event.stopPropagation();
          openBridgeSupport();
        }}
      >
        {t('page.bridge.pendingItem.contactSupport')}
      </button>
    );
  }
  if (action.kind === 'details') {
    const href = getBridgeRefundHref(action.txId, action.chainServerId);
    return (
      <button
        type="button"
        className="inline-flex h-[14px] items-center bg-transparent p-0 text-[12px] leading-[14px] gap-2"
        onClick={(event) => {
          event.stopPropagation();
          if (href) openInTab(href, !isTab);
        }}
      >
        <span className="text-r-neutral-body">{t('page.bridge.view')} </span>
        <span className="text-r-blue-default underline">
          {t('page.bridge.details')}
        </span>
      </button>
    );
  }
  return null;
};

const headerLabel = (
  detail: BridgeHistoryDetail,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  if (detail.header === 'refund') {
    return detail.action.kind === 'details' && detail.action.refundInSymbol
      ? t('page.bridge.refundIn', { token: detail.action.refundInSymbol })
      : t('page.bridge.pendingItem.refund');
  }
  return {
    processing: t('page.bridge.pendingItem.processing'),
    pending: t('page.bridge.pendingItem.pending'),
    succeeded: t('page.bridge.pendingItem.succeeded'),
    failed: t('page.bridge.pendingItem.failed'),
  }[detail.header];
};

export const BridgeHistoryStatus = ({
  data,
  local,
}: {
  data: BridgeHistory;
  local?: BridgeTxHistoryItem;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const detail = getBridgeHistoryDetail(data, local, now);

  useInterval(
    () => setNow(Date.now()),
    bridgeHistoryDetailIsLive(detail.scene) ? 1000 : undefined
  );

  return (
    <div className="bg-r-neutral-bg3">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className={clsx(
          'flex w-full cursor-pointer items-center gap-[10px] bg-transparent px-[12px] py-[8px] text-left',
          expanded && 'border-b border-solid border-r-neutral-line'
        )}
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
      >
        <div
          className={clsx(
            'flex min-w-0 flex-1 items-center gap-[4px]',
            headerTone[detail.header]
          )}
        >
          <HeaderIcon header={detail.header} />
          <span className="h-[16px] text-[13px] font-510 leading-[16px]">
            {headerLabel(detail, t)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-[4px]">
          <HeaderAction detail={detail} />
          <StatusChevron expanded={expanded} />
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-[22px] px-[16px] pb-[16px] pt-[12px]">
          {detail.steps.map((step, index) => (
            <HistoryStep
              key={`${step.direction}-${step.status}-${index}`}
              step={step}
              index={index + 1}
              isLast={index === detail.steps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
