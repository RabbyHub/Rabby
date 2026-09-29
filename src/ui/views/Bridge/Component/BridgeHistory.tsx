import { Popup } from '@/ui/component';
import { mergeBridgeSourceStatus } from '../utils/remoteFromTx';
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
import IconUnknown from 'ui/assets/token-default.svg';
import { ReactComponent as RCIconCCEmpty } from 'ui/assets/bridge/empty-cc.svg';
import { ReactComponent as RcIconRouteArrow } from 'ui/assets/bridge/IconRouteArrowCC.svg';
import { ReactComponent as RcIconHistoryChainArrow } from 'ui/assets/bridge/IconHistoryChainArrow.svg';
import { ReactComponent as RcIconCopyCC } from 'ui/assets/icon-copy-cc.svg';
import clsx from 'clsx';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { DrawerProps, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { findChain } from '@/utils/chain';
import { BridgeHistory } from '@/background/service/openapi';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import dayjs from 'dayjs';
import { useRabbySelector } from '@/ui/store';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import {
  BridgeHistoryStatus,
  BridgeHistoryTokenSymbol,
} from './BridgeHistoryStatus';
import {
  bridgeHistoryStatusKey,
  findLocalBridgeTx,
} from '../utils/historyRefresh';

const isTab = getUiType().isTab;

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

const shortTxId = (txId: string) =>
  txId.length > 12 ? `${txId.slice(0, 6)}…${txId.slice(-4)}` : txId;

const TxHashActions = ({
  txId,
  onOpen,
}: {
  txId: string;
  onOpen: () => void;
}) => {
  const { t } = useTranslation();
  if (!txId) return null;
  return (
    <>
      <button
        type="button"
        className="shrink-0 bg-transparent p-0 text-[12px] leading-[normal] text-r-neutral-body underline"
        onClick={onOpen}
      >
        {shortTxId(txId)}
      </button>
      <button
        type="button"
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center bg-transparent p-0 text-r-neutral-foot"
        onClick={(event) => {
          event.stopPropagation();
          copyTextToClipboard(txId);
          message.success(t('global.copied'));
        }}
      >
        <RcIconCopyCC className="block [&_path]:stroke-[0.875]" />
      </button>
    </>
  );
};

const MiniTokenAmount = ({
  token,
  amount,
  sign,
  tone,
  dimmed = false,
  approx = false,
}: {
  token?: TokenItem;
  amount?: number;
  sign: '+' | '-';
  tone: string;
  dimmed?: boolean;
  approx?: boolean;
}) => {
  const chain = findChain({ serverId: token?.chain });
  return (
    <div
      className={clsx('flex items-center gap-[8px]', dimmed && 'opacity-50')}
    >
      <div className="relative h-[16px] w-[16px] shrink-0 leading-[0]">
        <img
          className="block h-[16px] w-[16px] rounded-full object-cover"
          src={token?.logo_url || IconUnknown}
          width={16}
          height={16}
          alt=""
        />
        <img
          className="absolute bottom-[-2px] right-[-2px] block h-[8px] w-[8px] rounded-full object-cover"
          src={chain?.logo}
          width={8}
          height={8}
          alt=""
        />
      </div>
      <div
        className={clsx(
          'flex gap-[2px] whitespace-nowrap text-[12px] font-normal leading-[normal] items-center',
          tone
        )}
      >
        <span>{sign}</span>
        <span>
          {approx ? '≈' : ''}
          {formatAmount(amount || 0)}
        </span>
        <BridgeHistoryTokenSymbol token={token} />
      </div>
    </div>
  );
};

const GeneralHistoryBody = ({
  data,
  timeLabel,
  txId,
  payAmount,
  receiveAmount,
  receiveToken,
  received,
  receiving,
  sourceFailed,
  onOpen,
}: {
  data: BridgeHistory;
  timeLabel: string;
  txId: string;
  payAmount?: number;
  receiveAmount?: number;
  receiveToken?: TokenItem;
  received: boolean;
  receiving: boolean;
  sourceFailed: boolean;
  onOpen: () => void;
}) => {
  const { t } = useTranslation();
  const fromChain = findChain({ serverId: data.from_token?.chain });
  const toChain = findChain({ serverId: data.to_token?.chain });
  return (
    <div className="flex flex-col gap-[16px] px-[12px] pb-[16px] pt-[12px] leading-[normal]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="shrink-0 text-12 font-normal text-r-neutral-foot">
          {timeLabel}
        </span>
        <div className="flex min-w-0 items-center gap-[4px]">
          <div className="flex w-max min-w-0 max-w-full items-center gap-[4px] text-[12px] font-normal leading-[normal] tracking-[0.036px] text-r-neutral-body">
            <span
              title={fromChain?.name}
              className="min-w-0 max-w-max flex-1 truncate"
            >
              {fromChain?.name}
            </span>
            <span className="inline-flex h-[12px] w-[12px] shrink-0 items-center justify-center text-r-neutral-foot">
              <RcIconHistoryChainArrow className="block shrink-0" />
            </span>
            <span
              title={toChain?.name}
              className="min-w-0 max-w-max flex-1 truncate"
            >
              {toChain?.name}
            </span>
          </div>
          <TxHashActions txId={txId} onOpen={onOpen} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <img
            className="h-[32px] w-[32px] shrink-0 rounded-[9px] object-cover"
            src={data.aggregator?.logo_url || IconUnknown}
            width={32}
            height={32}
            alt=""
          />
          <div className="flex min-w-0 flex-col gap-[4px]">
            <span className="text-[12px] leading-[18px] text-r-neutral-title-1">
              {t('page.bridge.bridge')}
            </span>
            <span className="truncate text-[12px] text-r-neutral-foot">
              {data.aggregator?.name}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[8px]">
          <MiniTokenAmount
            token={data.from_token}
            amount={payAmount}
            sign="-"
            tone="text-r-neutral-title-1"
            dimmed={sourceFailed}
          />
          <MiniTokenAmount
            token={receiveToken}
            amount={receiveAmount}
            sign="+"
            tone="text-r-green-default"
            dimmed={!received && !receiving}
            approx={receiving}
          />
        </div>
      </div>
    </div>
  );
};

const DetailHistoryBody = ({
  data,
  timeLabel,
  txId,
  payAmount,
  receiveAmount,
  receiveToken,
  isSuccess,
  isFailed,
  receiving,
  onOpen,
}: {
  data: BridgeHistory;
  timeLabel: string;
  txId: string;
  payAmount?: number;
  receiveAmount?: number;
  receiveToken?: TokenItem;
  isSuccess: boolean;
  isFailed: boolean;
  receiving: boolean;
  onOpen: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-[20px] p-[12px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] leading-[normal] text-r-neutral-title-1">
          {timeLabel}
        </span>
        <div className="flex items-center gap-[4px]">
          <TxHashActions txId={txId} onOpen={onOpen} />
        </div>
      </div>

      <div className="flex items-center justify-between">
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
            isSuccess ? t('page.bridge.received') : t('page.bridge.estReceive')
          }
          approx={receiving}
          dimmed={!isSuccess && !receiving}
          align="end"
        />
      </div>

      <div
        className={clsx(
          'flex items-center gap-[4px] text-r-neutral-foot',
          isFailed && 'opacity-50'
        )}
      >
        <span className="text-[12px]">{t('page.bridge.by')}</span>
        <span className="text-[13px] font-medium">{data.aggregator?.name}</span>
        {data.aggregator?.name?.toLowerCase() !==
          data.bridge?.name?.toLowerCase() && (
          <span className="text-[12px]">
            {t('page.bridge.via-bridge', {
              bridge: data.bridge?.name || '',
            })}
          </span>
        )}
      </div>
    </div>
  );
};

interface TransactionProps {
  data: BridgeHistory;
  local?: BridgeTxHistoryItem;
  variant?: 'detail' | 'general';
}
const Transaction = forwardRef<HTMLDivElement, TransactionProps>(
  ({ data, local, variant = 'detail' }, ref) => {
    data = mergeBridgeSourceStatus(data, local);
    const isFailed = data.status === 'failed';
    const isSuccess = data.status === 'completed';
    const isSourceFailed = data.from_tx?.status
      ? data.from_tx.status === 'failed'
      : local?.status === 'fromFailed';
    // 源链失败即停止等待，即使接口整体状态仍是 pending。
    const receiving = data.status === 'pending' && !isSourceFailed;

    const txId =
      data.from_tx?.tx_id || data?.detail_url?.split('/').pop() || '';

    const gotoScan = () => {
      if (data?.detail_url) {
        openInTab(data.detail_url, !isTab);
      }
    };

    const receiveToken = isSuccess
      ? data.to_actual_token || data.to_token
      : data.to_token;
    const receiveAmount = isSuccess
      ? data.actual?.receive_token_amount ?? data.quote?.receive_token_amount
      : data.quote?.receive_token_amount;
    const payAmount = isSuccess
      ? data.actual?.pay_token_amount ?? data.quote?.pay_token_amount
      : data.quote?.pay_token_amount;

    return (
      <div
        className="relative overflow-hidden rounded-[8px] border-2 border-solid border-white bg-r-neutral-bg1 text-r-neutral-body dark:border-transparent dark:bg-r-neutral-card-1 dark:shadow-none"
        ref={ref}
      >
        {variant === 'general' ? (
          <GeneralHistoryBody
            data={data}
            timeLabel={sinceTime(data.create_at)}
            txId={txId}
            payAmount={payAmount}
            receiveAmount={receiveAmount}
            receiveToken={receiveToken}
            received={isSuccess}
            receiving={receiving}
            sourceFailed={isSourceFailed}
            onOpen={gotoScan}
          />
        ) : (
          <DetailHistoryBody
            data={data}
            timeLabel={sinceTime(data.create_at)}
            txId={txId}
            payAmount={payAmount}
            receiveAmount={receiveAmount}
            receiveToken={receiveToken}
            isSuccess={isSuccess}
            isFailed={isFailed}
            receiving={receiving}
            onOpen={gotoScan}
          />
        )}

        <BridgeHistoryStatus data={data} local={local} />
      </div>
    );
  }
);

export const BridgeHistoryCard = Transaction;

const HistorySide = ({
  token,
  amount,
  label,
  approx,
  dimmed = false,
  align = 'start',
}: {
  token?: TokenItem;
  amount?: number;
  label: string;
  approx?: boolean;
  dimmed?: boolean;
  align?: 'start' | 'end';
}) => (
  <div
    className={clsx(
      'flex min-w-0 items-center gap-[12px]',
      align === 'end' && 'justify-end',
      dimmed && 'opacity-50'
    )}
  >
    <HistoryToken token={token} />
    <div className="flex min-w-0 flex-col gap-px">
      <div className="flex items-center gap-[2px] whitespace-nowrap text-[14px] font-medium text-r-neutral-title-1">
        {approx && <span>≈</span>}
        <span>{formatAmount(amount || 0)}</span>
        <BridgeHistoryTokenSymbol token={token} underline={false} />
      </div>
      <span className="whitespace-nowrap text-[12px] text-r-neutral-foot">
        {label}
      </span>
    </div>
  </div>
);

const HistoryList = () => {
  const { txList, loading, loadingMore, ref } = useBridgeHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const address = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );
  const [locals, setLocals] = useState<BridgeTxHistoryItem[]>([]);
  const statusKey = bridgeHistoryStatusKey(txList?.list);

  useEffect(() => {
    let disposed = false;
    if (!address) {
      setLocals([]);
      return;
    }
    // 列表刷新时同步本地源链状态。
    wallet.getBridgeTxHistory(address).then((list) => {
      if (!disposed) setLocals(list || []);
    });
    return () => {
      disposed = true;
    };
  }, [address, statusKey, wallet]);

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
            local={findLocalBridgeTx(locals, swap.from_tx?.tx_id)}
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
      push={false}
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
