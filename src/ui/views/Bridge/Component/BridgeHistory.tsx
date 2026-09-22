import { openBridgeSupport } from '../utils/support';
import { Popup } from '@/ui/component';
import React, { forwardRef, useEffect, useState } from 'react';
import { useBridgeHistory } from '../hooks';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import {
  formatAmount,
  getUiType,
  openInTab,
  sinceTime,
  useWallet,
} from '@/ui/utils';
import { SvgIcPending } from 'ui/assets';
import { getTokenSymbol } from '@/ui/utils/token';
import { ReactComponent as RCIconCCEmpty } from 'ui/assets/bridge/empty-cc.svg';
import { ReactComponent as RcIconRouteArrow } from 'ui/assets/bridge/IconRouteArrowCC.svg';
import { ReactComponent as RcIconHistoryBack } from 'ui/assets/bridge/IconHistoryBackCC.svg';
import { ReactComponent as RcIconHistoryWarning } from 'ui/assets/bridge/IconHistoryWarningCC.svg';
import { ReactComponent as RcIconUndoCC } from 'ui/assets/bridge/IconUndoCC.svg';
import clsx from 'clsx';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ellipsis } from '@/ui/utils/address';
import { useTranslation } from 'react-i18next';
import { findChain } from '@/utils/chain';
import { BridgeHistory } from '@/background/service/openapi';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { DrawerProps } from 'antd';
import { useInterval } from 'ahooks';
import dayjs from 'dayjs';
import { useRabbySelector } from '@/ui/store';
import { formatEstimateClock } from '../utils/duration';
import { BRIDGE_PROGRESS_DELAY_MS } from '../utils/progressBar';
import { getBridgeRefundHref } from '../utils/refundLink';

const isTab = getUiType().isTab;
const SPIN_STYLE = { animation: 'spin 1.5s linear infinite' };

const HistoryToken = ({ token }: { token?: TokenItem }) => {
  const chain = findChain({ serverId: token?.chain });
  return (
    <div className="relative h-[32px] w-[32px] shrink-0 leading-[0]">
      <img
        className="block h-[32px] w-[32px] rounded-full object-cover"
        src={token?.logo_url}
        width={32}
        height={32}
        alt=""
      />
      <img
        className="absolute bottom-[-4px] right-[-4px] block h-[16px] w-[16px] rounded-full object-cover"
        src={chain?.logo}
        width={16}
        height={16}
        alt=""
      />
    </div>
  );
};

const Icon16 = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center">
    {children}
  </span>
);

const HistoryChevron = () => (
  <span className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center text-r-neutral-foot">
    <span className="inline-flex rotate-180">
      <RcIconHistoryBack className="block h-[14px] w-[14px] rotate-90" />
    </span>
  </span>
);

const formatTimeLeft = (seconds: number) => formatEstimateClock(seconds, true);

interface TransactionProps {
  data: BridgeHistory;
  local?: BridgeTxHistoryItem;
}
const Transaction = forwardRef<HTMLDivElement, TransactionProps>(
  ({ data, local }, ref) => {
    const { t } = useTranslation();
    const [now, setNow] = useState(() => Date.now());
    const isFailed = data.status === 'failed';
    const refundHref = getBridgeRefundHref(
      data.to_tx?.tx_id,
      data.to_actual_token?.chain
    );
    const hasRefund =
      isFailed &&
      !!refundHref &&
      !!data.to_actual_token?.id &&
      (data.to_actual_token.id !== data.to_token?.id ||
        data.to_actual_token.chain !== data.to_token?.chain ||
        Number(data.actual?.receive_token_amount) > 0);
    const isSourcePending =
      data.status === 'pending' && local?.status === 'pending';
    const isDestPending = data.status === 'pending' && !isSourcePending;
    const isSuccess = data.status === 'completed';
    const dimRoute = isFailed;

    useInterval(
      () => setNow(Date.now()),
      isSourcePending || isDestPending ? 1000 : undefined
    );

    const txId =
      data.from_tx?.tx_id || data?.detail_url?.split('/').pop() || '';
    const timeLabel = isSuccess
      ? dayjs((data.create_at || 0) * 1000).format('YYYY/MM/DD HH:mm')
      : sinceTime(data.create_at);

    const gotoScan = () => {
      if (data?.detail_url) {
        openInTab(data.detail_url, !isTab);
      }
    };

    const receiveToken = isSuccess
      ? data.to_actual_token || data.to_token
      : data.to_token;
    const receiveAmount = isSuccess
      ? data.actual?.receive_token_amount || data.quote?.receive_token_amount
      : data.quote?.receive_token_amount;
    const payAmount = isSuccess
      ? data.actual?.pay_token_amount || data.quote?.pay_token_amount
      : data.quote?.pay_token_amount;

    const startedAt = isDestPending
      ? local?.fromTxCompleteTs || (data.create_at || 0) * 1000
      : local?.createdAt;
    const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
    const remainingSeconds = (local?.estimatedDuration || 0) - elapsedMs / 1000;
    const isDelayed = isDestPending && elapsedMs >= BRIDGE_PROGRESS_DELAY_MS;

    return (
      <div
        className="relative overflow-hidden rounded-[8px] border-2 border-solid border-white bg-r-neutral-bg1 text-r-neutral-body dark:border-transparent dark:bg-r-neutral-card-1 dark:shadow-none"
        ref={ref}
      >
        <div className="flex flex-col gap-[20px] p-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-r-neutral-title-1">
              {timeLabel}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-[4px] bg-transparent p-0"
              onClick={gotoScan}
            >
              <span
                className={clsx(
                  'text-[12px] underline',
                  isSuccess ? 'text-r-neutral-body' : 'text-r-neutral-foot'
                )}
              >
                {txId ? ellipsis(txId) : ''}
              </span>
              {isFailed && !hasRefund && <HistoryChevron />}
            </button>
          </div>

          <div
            className={clsx(
              'flex items-center justify-between',
              dimRoute && 'opacity-50'
            )}
          >
            <HistorySide
              token={data.from_token}
              amount={payAmount}
              label={t('page.bridge.sent')}
            />
            <span className="inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden text-r-neutral-foot">
              <RcIconRouteArrow className="block shrink-0" />
            </span>
            <HistorySide
              token={receiveToken}
              amount={receiveAmount}
              label={
                isSuccess || isSourcePending
                  ? t('page.bridge.received')
                  : t('page.bridge.estReceive')
              }
              approx
              align="end"
            />
          </div>

          <div
            className={clsx(
              'flex items-end gap-[4px] text-r-neutral-foot',
              dimRoute && 'opacity-50'
            )}
          >
            <span className="text-[12px]">{t('page.bridge.by')}</span>
            <span className="text-[13px] font-medium">
              {data.aggregator?.name}
            </span>
            <span className="text-[12px]">
              {t('page.bridge.via-bridge', {
                bridge: data.bridge?.name || '',
              })}
            </span>
          </div>
        </div>

        {isSourcePending && (
          <HistoryBar tone="processing">
            {!!local?.estimatedDuration && (
              <>
                <span className="text-[13px] text-r-neutral-body">
                  {t('page.bridge.timeLeft', {
                    time: formatTimeLeft(remainingSeconds),
                  })}
                </span>
                <HistoryChevron />
              </>
            )}
          </HistoryBar>
        )}
        {isDestPending && (
          <HistoryBar tone="pending">
            {isDelayed ? (
              <span className="text-[12px] text-r-neutral-foot">
                {t('page.bridge.pendingItem.popupBridgeDelayed')}
                {', '}
                <button
                  type="button"
                  className="inline bg-transparent p-0 text-[12px] text-r-blue-default underline"
                  onClick={() => openBridgeSupport()}
                >
                  {t('page.bridge.pendingItem.contactSupport')}
                </button>
              </span>
            ) : local?.estimatedDuration && remainingSeconds > 0 ? (
              <span className="text-[13px] text-r-neutral-body">
                {t('page.bridge.timeLeft', {
                  time: formatTimeLeft(remainingSeconds),
                })}
              </span>
            ) : (
              <span className="text-[12px] text-r-neutral-foot">
                {t('page.bridge.pendingItem.stillBridging')}
              </span>
            )}
          </HistoryBar>
        )}
        {hasRefund && (
          <div className="flex w-full items-center gap-[10px] bg-r-neutral-bg2 p-[8px] dark:bg-r-neutral-line">
            <div className="flex min-w-0 flex-1 items-center gap-[4px] text-r-neutral-body">
              <Icon16>
                <RcIconUndoCC className="block h-[16px] w-[16px] -scale-y-100 rotate-180" />
              </Icon16>
              <span className="text-[13px] font-medium">
                {data.to_actual_token
                  ? t('page.bridge.refundIn', {
                      token: getTokenSymbol(data.to_actual_token),
                    })
                  : t('page.bridge.pendingItem.refund')}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-[4px]">
              <button
                type="button"
                className="inline-flex items-center bg-transparent p-0 text-[12px] gap-2"
                onClick={() => openInTab(refundHref, !isTab)}
              >
                <span className="text-r-neutral-body">
                  {t('page.bridge.view')}{' '}
                </span>
                <span className="text-r-blue-default underline">
                  {t('page.bridge.details')}
                </span>
              </button>
            </div>
          </div>
        )}
        {isFailed && !hasRefund && (
          <div className="flex items-center gap-[10px] bg-r-red-light p-[8px]">
            <div className="flex min-w-0 flex-1 items-center gap-[4px] text-r-red-default">
              <Icon16>
                <RcIconHistoryWarning className="block h-[16px] w-[16px]" />
              </Icon16>
              <span className="text-[13px] font-medium">
                {t('page.bridge.pendingItem.failed')}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex items-center bg-transparent p-0 text-[12px] text-r-blue-default underline"
              onClick={openBridgeSupport}
            >
              {t('page.bridge.pendingItem.contactSupport')}
            </button>
          </div>
        )}
      </div>
    );
  }
);

const HistorySide = ({
  token,
  amount,
  label,
  approx,
  align = 'start',
}: {
  token?: TokenItem;
  amount?: number;
  label: string;
  approx?: boolean;
  align?: 'start' | 'end';
}) => (
  <div
    className={clsx(
      'flex min-w-0 items-center gap-[12px]',
      align === 'end' && 'justify-end'
    )}
  >
    <HistoryToken token={token} />
    <div className="flex min-w-0 flex-col gap-px">
      <div className="flex items-center gap-[2px] whitespace-nowrap text-[14px] font-medium text-r-neutral-title-1">
        {approx && <span>≈</span>}
        <span>{formatAmount(amount || 0)}</span>
        <span>{getTokenSymbol(token)}</span>
      </div>
      <span className="whitespace-nowrap text-[12px] text-r-neutral-foot">
        {label}
      </span>
    </div>
  </div>
);

const HistoryBar = ({
  tone,
  children,
}: {
  tone: 'processing' | 'pending';
  children: React.ReactNode;
}) => (
  <div
    className={clsx(
      'flex items-center gap-[10px] p-[8px]',
      tone === 'processing'
        ? 'bg-r-blue-light-1 text-r-blue-default'
        : 'bg-r-orange-light text-r-orange-default'
    )}
  >
    <div className="flex min-w-0 flex-1 items-center gap-[4px]">
      <Icon16>
        <SvgIcPending
          className="block h-[16px] w-[16px] animate-spin [&_path]:stroke-current"
          style={SPIN_STYLE}
        />
      </Icon16>
      <span className="text-[13px] font-medium">
        {tone === 'processing' ? <ProcessingLabel /> : <PendingLabel />}
      </span>
    </div>
    <div className="flex shrink-0 items-center gap-[4px]">{children}</div>
  </div>
);

const ProcessingLabel = () => {
  const { t } = useTranslation();
  return <>{t('page.bridge.pendingItem.processing')}</>;
};
const PendingLabel = () => {
  const { t } = useTranslation();
  return <>{t('page.bridge.pendingItem.pending')}</>;
};

const HistoryList = () => {
  const { txList, loading, loadingMore, ref } = useBridgeHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const address = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );
  const [locals, setLocals] = useState<BridgeTxHistoryItem[]>([]);

  useEffect(() => {
    if (!address) return;
    wallet.getBridgeTxHistory(address).then((list) => {
      setLocals(list || []);
    });
  }, [address, txList?.list?.length, wallet]);

  if (!loading && (!txList || !txList?.list?.length)) {
    return (
      <div className="w-full h-full flex flex-col items-center">
        <RCIconCCEmpty
          viewBox="0 0 40 40"
          className="w-[52px] h-[52px] mx-auto mt-[112px] mb-24 text-r-neutral-body"
        />
        <p className="text-center text-r-neutral-body text-14">
          {t('page.bridge.no-transaction-records')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[434px] space-y-[12px] pb-20">
      {txList?.list
        ?.sort((a, b) => {
          let aIndex = 0,
            bIndex = 0;
          if (a.status === 'pending') {
            aIndex = 1;
          }
          if (b.status === 'pending') {
            bIndex = 1;
          }
          return bIndex - aIndex;
        })
        ?.map((swap, idx) => (
          <Transaction
            ref={txList?.list.length - 1 === idx ? ref : undefined}
            key={`${swap.detail_url}-${idx}`}
            data={swap}
            local={locals.find(
              (item) =>
                item.hash === swap.from_tx?.tx_id ||
                item.acceleratedHash === swap.from_tx?.tx_id
            )}
          />
        ))}
      {((loading && !txList) || loadingMore) && (
        <>
          <SkeletonInput className="w-full h-[168px] rounded-[6px]" active />
          <SkeletonInput className="w-full h-[168px] rounded-[6px]" active />
        </>
      )}
    </div>
  );
};

export const BridgeTxHistory = ({
  visible,
  onClose,
  getContainer,
}: {
  visible: boolean;
  onClose: () => void;
  getContainer?: DrawerProps['getContainer'];
}) => {
  const { t } = useTranslation();
  return (
    <Popup
      visible={visible}
      title={t('page.bridge.history')}
      height={494}
      onClose={onClose}
      closable
      bodyStyle={{
        paddingTop: 16,
        paddingBottom: 0,
      }}
      destroyOnClose
      isSupportDarkMode
      isNew
      getContainer={getContainer}
    >
      <HistoryList />
    </Popup>
  );
};
