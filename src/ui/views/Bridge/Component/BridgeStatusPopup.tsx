import { openBridgeSupport } from '../utils/support';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useInterval } from 'ahooks';
import clsx from 'clsx';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ReactComponent as RcIconFailedCC } from '@/ui/assets/bridge/IconFailedCC.svg';
import { ReactComponent as RcIconQueuedCC } from '@/ui/assets/bridge/IconQueuedCC.svg';
import { ReactComponent as RcIconSelectCC } from '@/ui/assets/bridge/IconSelectCC.svg';
import { ReactComponent as RcIconUndoCC } from '@/ui/assets/bridge/IconUndoCC.svg';
import { ReactComponent as RcImgArrowCC } from '@/ui/assets/bridge/ImgArrowCC.svg';
import IconUnknown from '@/ui/assets/token-default.svg';
import { SvgIcPending } from 'ui/assets';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Image } from 'antd';
import { getUiType, openInTab } from '@/ui/utils';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChain } from '@/utils/chain';
import { getBridgeRefundHref } from '../utils/refundLink';
import {
  BridgePopupState,
  BridgePopupStep,
  getBridgePopupState,
} from '../utils/progressBar';

const SPIN_STYLE = { animation: 'spin 1.5s linear infinite' };
const SPINNER_CLASS = 'h-16 w-16 shrink-0 animate-spin [&_path]:stroke-current';

const TokenWithChain = ({
  token,
  chain,
}: {
  token?: string;
  chain?: string;
}) => {
  const chainItem = findChain({ serverId: chain }) || null;
  return (
    <div className="relative h-[24px] w-[24px] shrink-0">
      <Image
        className="block h-[24px] w-[24px] rounded-full object-cover"
        src={token || IconUnknown}
        fallback={IconUnknown}
        preview={false}
        width={24}
        height={24}
      />
      <TooltipWithMagnetArrow
        title={chainItem?.name}
        className="rectangle w-max"
      >
        <img
          className="absolute left-[14px] top-[-4px] h-[14px] w-[14px] rounded-full object-cover"
          src={chainItem?.logo || IconUnknown}
          alt={chainItem?.name}
          width={14}
          height={14}
        />
      </TooltipWithMagnetArrow>
    </div>
  );
};

const StepBadge = ({ status }: { status: BridgePopupStep }) => {
  const { t } = useTranslation();
  const tone = {
    processing: 'bg-r-blue-light-1 text-r-blue-default',
    queued: 'bg-r-neutral-bg-4 text-r-neutral-foot',
    pending: 'bg-r-orange-light text-r-orange-default',
    completed: 'bg-r-green-light text-r-green-default',
    failed: 'bg-r-red-light text-r-red-default',
    refund: 'bg-r-neutral-bg-2 text-r-neutral-body',
  }[status];
  const icon = {
    processing: <SvgIcPending className={SPINNER_CLASS} style={SPIN_STYLE} />,
    queued: <RcIconQueuedCC className="h-16 w-16 shrink-0" />,
    pending: <SvgIcPending className={SPINNER_CLASS} style={SPIN_STYLE} />,
    completed: <RcIconSelectCC className="h-16 w-16 shrink-0" />,
    failed: <RcIconFailedCC className="h-16 w-16 shrink-0" />,
    refund: (
      <RcIconUndoCC className="h-16 w-16 shrink-0 -scale-y-100 rotate-180 text-r-neutral-foot" />
    ),
  }[status];
  const label = {
    processing: t('page.bridge.pendingItem.processing'),
    queued: t('page.bridge.pendingItem.queued'),
    pending: t('page.bridge.pendingItem.pending'),
    completed: t('page.bridge.pendingItem.completed'),
    failed: t('page.bridge.pendingItem.failed'),
    refund: t('page.bridge.pendingItem.refund'),
  }[status];

  return (
    <div
      className={clsx(
        'flex items-center gap-[4px] rounded-[4px] px-[8px] py-[6px]',
        tone
      )}
    >
      {icon}
      <span className="text-13 font-medium leading-[16px]">{label}</span>
    </div>
  );
};

const StepCard = ({
  index,
  title,
  status,
  token,
  amount,
  usd,
  sign,
  amountFade,
  approx,
  dimCompleted = false,
}: {
  index: number;
  title: string;
  status: BridgePopupStep;
  token?: TokenItem;
  amount?: number;
  usd?: string;
  sign: '+' | '-';
  amountFade?: '40' | '50';
  approx?: boolean;
  dimCompleted?: boolean;
}) => {
  const headerTone =
    status === 'queued'
      ? 'text-r-neutral-foot'
      : status === 'failed' || dimCompleted
      ? 'text-r-neutral-title-1 opacity-50'
      : 'text-r-neutral-title-1';
  const amountTone =
    amountFade === '40'
      ? 'opacity-40'
      : amountFade === '50'
      ? 'opacity-50'
      : '';

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-[8px] bg-r-neutral-card-1">
      <div className="flex h-[44px] items-center justify-between border-b-[0.5px] border-solid border-rabby-neutral-line pl-[12px] pr-[10px]">
        <div className={clsx('flex items-center gap-[6px]', headerTone)}>
          <span className="text-20 font-bold leading-[24px]">{index}</span>
          <span className="text-15 font-bold">{title}</span>
        </div>
        <StepBadge status={status} />
      </div>
      <div
        className={clsx(
          'flex h-[48px] items-center justify-between',
          status === 'refund' ? 'px-[16px]' : 'px-[12px]',
          dimCompleted && 'opacity-50'
        )}
      >
        <div className="flex items-center gap-[10px]">
          <TokenWithChain token={token?.logo_url} chain={token?.chain} />
          <span
            className={clsx(
              'text-13 font-bold leading-[16px] text-r-neutral-title-1',
              amountTone
            )}
          >
            {sign} {formatTokenAmount(amount || 0)} {getTokenSymbol(token)}
          </span>
        </div>
        <span
          className={clsx(
            'text-13 leading-[16px] text-r-neutral-title-1',
            amountTone
          )}
        >
          {sign}
          {approx ? '≈' : ''}
          {formatUsdValue(usd || 0)}
        </span>
      </div>
    </div>
  );
};

const StepArrow = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center justify-center py-[8px]">
    <RcImgArrowCC
      className={clsx(
        'shrink-0 text-r-neutral-foot opacity-50',
        compact ? 'h-24 w-24' : 'h-28 w-28'
      )}
    />
  </div>
);

const usdOf = (amount?: number, price?: number) =>
  amount && price ? String(amount * price) : '0';

export const BridgeStatusPopup = ({
  data,
  onClose,
}: {
  data: BridgeTxHistoryItem;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useInterval(
    () => setNow(Date.now()),
    data.status === 'pending' || data.status === 'fromSuccess'
      ? 1000
      : undefined
  );
  const popupState = getBridgePopupState(data, now);
  const refundHref = refundLink(popupState);
  // 极端场景：如果没有退款链接，即使退款了也当做失败
  const popup =
    popupState.button === 'refund' && !refundHref
      ? {
          title: 'failed' as const,
          step1: popupState.step1,
          step2: popupState.step2,
          caption: popupState.caption,
          button: 'failedSupport' as const,
        }
      : popupState;
  // 成功后展示实际到账信息；未返回实际数据时才回退报价，实际数量为 0 也保留。
  const receiveToken =
    data.status === 'fromFailed'
      ? data.fromToken
      : data.status === 'allSuccess'
      ? data.actualToToken ?? data.toToken
      : data.toToken;
  const receiveAmount =
    data.status === 'fromFailed'
      ? data.fromAmount
      : data.status === 'allSuccess'
      ? data.actualToAmount ?? data.toAmount
      : data.toAmount;
  const fromChain = findChain({ serverId: data.fromToken?.chain });
  const toChain = findChain({ serverId: receiveToken?.chain });
  const refundChain = findChain({
    serverId: data.actualToToken?.chain,
  });

  const title = {
    processing: t('page.bridge.pendingItem.popupProcessing'),
    pending: t('page.bridge.pendingItem.popupPending'),
    failed: t('page.bridge.pendingItem.popupFailed'),
    refunded: t('page.bridge.pendingItem.popupRefunded'),
    completed: t('page.bridge.pendingItem.popupCompleted'),
  }[popup.title];

  // 第二步仍在 pending（倒计时含≤5s / Still Bridging / 目标链延迟）时金额行不淡化；
  // 仅源链未完成、第二步还是 queued 时用半透明。
  const receiveFade =
    popup.step2 === 'queued'
      ? '40'
      : popup.step2 === 'failed'
      ? '50'
      : undefined;

  return (
    <div className="flex h-[440px] w-full shrink-0 flex-col px-[20px] pb-[20px]">
      <div className="flex h-[52px] shrink-0 items-center justify-center text-center text-20 font-medium text-r-neutral-title-1">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[16px]">
        <StepCard
          index={1}
          title={t('page.bridge.pendingItem.sendingFrom', {
            chain: fromChain?.name || '',
          })}
          status={popup.step1}
          token={data.fromToken}
          amount={data.fromAmount}
          usd={usdOf(data.fromAmount, data.fromToken?.price)}
          sign="-"
          amountFade={popup.step1 === 'failed' ? '50' : undefined}
          dimCompleted={
            popup.step1 === 'completed' && popup.step2 !== 'completed'
          }
        />
        <StepArrow compact={!!popup.step3 || popup.step2 === 'refund'} />
        <StepCard
          index={2}
          title={t('page.bridge.pendingItem.receivingTo', {
            chain: toChain?.name || '',
          })}
          status={popup.step2}
          token={receiveToken}
          amount={receiveAmount}
          usd={usdOf(receiveAmount, receiveToken?.price)}
          sign="+"
          amountFade={receiveFade}
          approx={popup.step2 === 'queued' || popup.step2 === 'pending'}
        />
        {popup.step3 && (
          <>
            <StepArrow compact />
            <StepCard
              index={3}
              title={t('page.bridge.pendingItem.receivingTo', {
                chain: refundChain?.name || '',
              })}
              status="refund"
              token={data.actualToToken}
              amount={data.actualToAmount}
              usd={usdOf(data.actualToAmount, data.actualToToken?.price)}
              sign="+"
            />
          </>
        )}
      </div>
      <div className="shrink-0">
        <PopupCaption popup={popup} data={data} />
        <PopupButton popup={popup} href={refundHref} onClose={onClose} />
      </div>
    </div>
  );
};

const refundLink = (popup: BridgePopupState) => {
  if (popup.button !== 'refund') return '';
  return getBridgeRefundHref(popup.refund?.txId, popup.refund?.chainServerId);
};

const PopupCaption = ({
  popup,
  data,
}: {
  popup: BridgePopupState;
  data: BridgeTxHistoryItem;
}) => {
  const { t } = useTranslation();
  if (popup.caption.kind === 'none') return <div className="h-[16px]" />;

  let content: React.ReactNode = null;
  if (popup.caption.kind === 'estimate') {
    content = (
      <Trans
        t={t}
        i18nKey="page.bridge.pendingItem.popupEstCompletion"
        values={{ time: popup.caption.time }}
        components={{
          time: <span className="text-r-neutral-title-1" />,
        }}
      />
    );
  } else if (popup.caption.kind === 'stillBridging') {
    content = t('page.bridge.pendingItem.stillBridging');
  } else if (popup.caption.kind === 'delayed') {
    content = t('page.bridge.pendingItem.popupBridgeDelayed');
  } else if (popup.caption.kind === 'sourceFailed') {
    content = t('page.bridge.pendingItem.sourceFailed', {
      token: getTokenSymbol(data.fromToken),
    });
  } else if (popup.caption.kind === 'failed') {
    content = t('page.bridge.pendingItem.popupBridgeFailed');
  } else {
    content = t('page.bridge.pendingItem.popupRefundedIn', {
      token: getTokenSymbol(data.actualToToken),
    });
  }

  return (
    <div className="mb-[12px] mt-[16px] px-[12px] text-center text-[16px] text-r-neutral-foot">
      {content}
    </div>
  );
};

const PopupButton = ({
  popup,
  href,
  onClose,
}: {
  popup: BridgePopupState;
  href: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const label = {
    back: t('page.bridge.pendingItem.goBack'),
    delayedSupport: t('page.bridge.pendingItem.contactSupport'),
    failedSupport: t('page.bridge.pendingItem.contactSupport'),
    refund: t('page.bridge.pendingItem.viewRefundedDetails'),
  }[popup.button];
  const disabled = popup.button === 'refund' && !href;

  const onClick = () => {
    if (popup.button === 'back') {
      onClose();
      return;
    }
    if (popup.button === 'delayedSupport' || popup.button === 'failedSupport') {
      openBridgeSupport();
      return;
    }
    if (href) {
      openInTab(href, !getUiType().isTab);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className="h-[48px] w-full rounded-[6px] bg-r-blue-default text-[16px] font-medium text-r-neutral-title-2 disabled:opacity-40"
      onClick={onClick}
    >
      {label}
    </button>
  );
};
