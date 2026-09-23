import { openBridgeSupport } from '../utils/support';
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useInterval } from 'ahooks';
import clsx from 'clsx';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ReactComponent as RcIconFailedCC } from '@/ui/assets/bridge/IconFailedCC.svg';
import { ReactComponent as RcIconQueuedCC } from '@/ui/assets/bridge/IconQueuedCC.svg';
import { ReactComponent as RcIconSelectCC } from '@/ui/assets/bridge/IconSelectCC.svg';
import { ReactComponent as RcIconUndoCC } from '@/ui/assets/bridge/IconUndoCC.svg';
import { ReactComponent as RcIconStepArrowCC } from '@/ui/assets/bridge/IconStepArrowCC.svg';
import { SvgIcPending } from 'ui/assets';
import { getUiType, openInTab } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import {
  BridgeProgressFooter,
  BridgeProgressStep,
  getBridgeProgressBar,
} from '../utils/progressBar';
import { getBridgeRefundHref } from '../utils/refundLink';

const SPIN_STYLE = { animation: 'spin 1.5s linear infinite' };
const SPINNER_CLASS = 'h-16 w-16 shrink-0 animate-spin [&_path]:stroke-current';

const stopAnd = (event: React.MouseEvent, action: () => void) => {
  event.stopPropagation();
  action();
};

const STEP_TONE: Record<BridgeProgressStep, string> = {
  sourceLoading: 'text-r-blue-default',
  destLoading: 'text-r-blue-default',
  destDelayed: 'text-r-orange-default',
  success: 'text-r-green-default',
  destFailed: 'text-r-red-default',
  queued: 'text-r-neutral-foot',
  sourceFailed: 'text-r-neutral-foot',
  undo: 'text-r-neutral-foot',
};

const StepMark = ({
  step,
  status,
}: {
  step: 1 | 2;
  status: BridgeProgressStep;
}) => {
  const icon = {
    sourceLoading: (
      <SvgIcPending className={SPINNER_CLASS} style={SPIN_STYLE} />
    ),
    destLoading: <SvgIcPending className={SPINNER_CLASS} style={SPIN_STYLE} />,
    destDelayed: <SvgIcPending className={SPINNER_CLASS} style={SPIN_STYLE} />,
    success: <RcIconSelectCC className="h-16 w-16 shrink-0" />,
    destFailed: <RcIconFailedCC className="h-16 w-16 shrink-0" />,
    queued: <RcIconQueuedCC className="h-16 w-16 shrink-0" />,
    sourceFailed: (
      <RcIconFailedCC className="h-16 w-16 shrink-0 text-r-red-default" />
    ),
    undo: (
      <RcIconUndoCC className="h-16 w-16 shrink-0 -scale-y-100 rotate-180" />
    ),
  }[status];

  return (
    <div className={clsx('flex items-center gap-[2px]', STEP_TONE[status])}>
      <span className="text-15 font-medium">{step}.</span>
      {icon}
    </div>
  );
};

const linkClass =
  'inline cursor-pointer bg-transparent p-0 align-baseline text-12 leading-[14px] text-r-blue-default underline';

const TextAndLink = ({
  text,
  link,
  onClick,
}: {
  text: React.ReactNode;
  link: React.ReactNode;
  onClick: () => void;
}) => (
  <>
    <div>{text}</div>
    <button
      type="button"
      className={linkClass}
      onClick={(event) => stopAnd(event, onClick)}
    >
      {link}
    </button>
  </>
);

const ProgressFooter = ({
  footer,
  data,
}: {
  footer: BridgeProgressFooter;
  data: BridgeTxHistoryItem;
}) => {
  const { t } = useTranslation();
  if (footer.kind === 'none') return null;

  const refundHref =
    footer.kind === 'refund'
      ? getBridgeRefundHref(footer.txId, footer.chainServerId)
      : '';
  let content: React.ReactNode = null;
  if (footer.kind === 'countdown') {
    content = (
      <Trans
        t={t}
        i18nKey="page.bridge.pendingItem.bridgingEta"
        values={{ time: footer.time }}
        components={{
          time: <span className="text-r-neutral-title-1" />,
        }}
      />
    );
  } else if (footer.kind === 'stillBridging') {
    content = t('page.bridge.pendingItem.stillBridging');
  } else if (footer.kind === 'delayed') {
    content = (
      <TextAndLink
        text={
          <>
            {t('page.bridge.pendingItem.popupBridgeDelayed')}
            {','}
          </>
        }
        link={t('page.bridge.pendingItem.contactSupport')}
        onClick={openBridgeSupport}
      />
    );
  } else if (footer.kind === 'sourceFailed') {
    content = t('page.bridge.pendingItem.sourceFailed', {
      token: getTokenSymbol(data.fromToken),
    });
  } else if (footer.kind === 'refund' && refundHref) {
    const openRefund = () => openInTab(refundHref, !getUiType().isTab);
    content = footer.isOriginalToken ? (
      <TextAndLink
        text={
          <>
            {t('page.bridge.pendingItem.refundedLead', {
              defaultValue: 'Refunded',
            })}
            {', '}
            {t('page.bridge.view')}
          </>
        }
        link={t('page.bridge.details')}
        onClick={openRefund}
      />
    ) : (
      <TextAndLink
        text={
          <>
            {t('page.bridge.pendingItem.popupRefundedIn', {
              token: getTokenSymbol(data.actualToToken),
            })}
            {', '}
            {t('page.bridge.view')}
          </>
        }
        link={t('page.bridge.pendingItem.refundedDetails', {
          defaultValue: 'Refunded Details',
        })}
        onClick={openRefund}
      />
    );
  } else {
    content = (
      <TextAndLink
        text={
          <>
            {t('page.bridge.pendingItem.popupBridgeFailed')}
            {','}
          </>
        }
        link={t('page.bridge.pendingItem.contactSupport')}
        onClick={openBridgeSupport}
      />
    );
  }

  return (
    <div className="flex items-center justify-center gap-[4px] bg-r-neutral-bg-3 py-[8px] text-center text-12 leading-[14px] text-r-neutral-foot">
      {content}
    </div>
  );
};

export const BridgeProgressCard = ({
  data,
  onOpen,
  children,
}: {
  data: BridgeTxHistoryItem;
  onOpen: () => void;
  children: React.ReactNode;
}) => {
  const [now, setNow] = useState(() => Date.now());
  useInterval(
    () => setNow(Date.now()),
    data.status === 'fromSuccess' ? 1000 : undefined
  );
  const progress = getBridgeProgressBar(data, now);

  return (
    <div
      className={clsx(
        'cursor-pointer overflow-hidden rounded-[8px] border-2 border-solid border-white bg-r-neutral-card-1 shadow-[0px_4px_20px_rgba(55,56,63,0.06)] dark:border-transparent dark:shadow-none',
        'hover:border-rabby-blue-default hover:bg-blue-light/10'
      )}
      onClick={onOpen}
    >
      <div className="flex items-center justify-between px-[16px] py-[12px]">
        {children}
        <div className="flex items-center gap-[6px]">
          <StepMark step={1} status={progress.step1} />
          <span className="flex h-14 w-14 shrink-0 items-center justify-center text-r-neutral-foot">
            <RcIconStepArrowCC className="block h-[8.41725px] w-[11.6027px] [&_path]:stroke-current" />
          </span>
          <StepMark step={2} status={progress.step2} />
        </div>
      </div>
      <ProgressFooter footer={progress.footer} data={data} />
    </div>
  );
};
