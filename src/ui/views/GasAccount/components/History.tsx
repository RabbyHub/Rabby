import React from 'react';
import { ReactComponent as RcIconEmptyCC } from '@/ui/assets/empty-cc.svg';
import { useTranslation } from 'react-i18next';
import { formatGasAccountUSDValue, sinceTime } from '@/ui/utils';
import clsx from 'clsx';
import type { useGasAccountHistory } from '../hooks';
import { Skeleton, Tooltip } from 'antd';
import { ReactComponent as RcIconPendingCC } from '@/ui/assets/pending-cc.svg';
import { ReactComponent as RcIconOpenExternalCC } from '@/ui/assets/open-external-cc.svg';
import { findChainByServerID } from '@/utils/chain';
import { ReactComponent as IconGift } from '@/ui/assets/gift-green.svg';

type GasAccountHistoryState = ReturnType<typeof useGasAccountHistory>;

const HistoryItem = ({
  time,
  isPending = false,
  value = 0,
  sign = '-',
  className,
  borderT = false,
  chainServerId,
  txId,
  isWithdraw = false,
  source = '',
}: {
  time: number;
  value: number;
  sign: string;
  className?: string;
  isPending?: boolean;
  borderT?: boolean;
  isWithdraw?: boolean;
  chainServerId?: string;
  txId?: string;
  source?: string;
}) => {
  const { t } = useTranslation();

  const gotoTxDetail = () => {
    if (chainServerId && txId && !isWithdraw) {
      const chain = findChainByServerID(chainServerId);
      if (chain && chain.scanLink) {
        const scanLink = chain.scanLink.replace('_s_', '');

        window.open(`${scanLink}${txId}`);
      }
    }
  };

  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        borderT && 'border-t-[0.5px] border-solid border-rabby-neutral-card2',
        isPending ? 'px-16 py-12' : 'px-16 h-[48px]',
        className
      )}
    >
      {isPending ? (
        <div
          className={clsx(
            'flex items-center justify-center gap-6',
            'cursor-pointer',
            'px-10 py-6',
            'bg-r-orange-light rounded-[900px]',
            'text-13 font-medium text-r-orange-default'
          )}
          onClick={gotoTxDetail}
        >
          <RcIconPendingCC
            viewBox="0 0 16 16"
            className="w-16 h-16 animate-spin"
          />
          <div>
            {isWithdraw
              ? t('page.gasAccount.withdraw')
              : t('page.gasAccount.deposit')}
          </div>
          {!isWithdraw && (
            <RcIconOpenExternalCC viewBox="0 0 12 12" className="w-12 h-12" />
          )}
        </div>
      ) : (
        <div className="text-14 text-r-neutral-foot">{sinceTime(time)}</div>
      )}
      <div className="text-14 font-medium text-r-neutral-title-1 flex items-center gap-4 justify-center">
        {source === 'gas_account_airdrop' && (
          <Tooltip
            overlayClassName={clsx('rectangle')}
            align={{ targetOffset: [0, 0] }}
            title="Gas Reward for active users"
          >
            <IconGift
              viewBox="0 0 24 24"
              className="w-24 h-24 text-r-neutral-title-1"
            />
          </Tooltip>
        )}
        {sign}
        {formatGasAccountUSDValue(value)}{' '}
      </div>
    </div>
  );
};

const LoadingItem = ({ borderT }: { borderT: boolean }) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        borderT && 'border-t-[0.5px] border-solid border-rabby-neutral-card2',
        'px-16 h-[48px]'
      )}
    >
      <Skeleton.Input className="rounded w-[68px] h-[16px]" active />
      <Skeleton.Input className="rounded w-[40px] h-[16px]" active />
    </div>
  );
};

export const GasAccountHistory = ({
  historyState,
}: {
  historyState: GasAccountHistoryState;
}) => {
  const { t } = useTranslation();
  const { loading, txList, loadingMore, ref } = historyState;

  if (
    !loading &&
    !txList?.rechargeList.length &&
    !txList?.withdrawList.length &&
    !txList?.list.length
  ) {
    return (
      <div className="bg-r-neutral-card-1 h-full min-h-[283px] flex flex-col items-center justify-center gap-10 rounded-[12px] px-20">
        <RcIconEmptyCC
          viewBox="0 0 40 40"
          className="w-32 h-32 text-r-neutral-foot"
        />
        <span className="text-13 font-medium text-r-neutral-foot">
          {t('page.gasAccount.history.noHistoryForPast30Days', {
            defaultValue: 'No history for the past 30 days.',
          })}
        </span>
      </div>
    );
  }
  return (
    <div className="bg-r-neutral-card-1 flex flex-col rounded-[12px] overflow-hidden">
      {!loading &&
        txList?.rechargeList?.map((item, index) => (
          <HistoryItem
            key={item.create_at}
            time={item.create_at}
            value={item.amount}
            sign={'+'}
            borderT={index !== 0}
            isPending={true}
            chainServerId={item?.chain_id}
            txId={item?.tx_id}
          />
        ))}
      {!loading &&
        txList?.withdrawList?.map((item, index) => (
          <HistoryItem
            isWithdraw={true}
            key={item.create_at}
            time={item.create_at}
            value={item.amount}
            sign={'-'}
            borderT={!txList.rechargeList.length ? index !== 0 : true}
            isPending={true}
            chainServerId={item?.chain_id}
            txId={item?.tx_id}
          />
        ))}
      {!loading &&
        txList?.list.map((item, index) => (
          <HistoryItem
            key={item.create_at}
            time={item.create_at}
            value={item.usd_value}
            sign={item.history_type === 'recharge' ? '+' : '-'}
            borderT={
              !txList?.rechargeList.length && !txList?.withdrawList.length
                ? index !== 0
                : true
            }
            source={item.source}
          />
        ))}

      {(loading && !txList) || loadingMore ? (
        <>
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingItem
              key={index}
              borderT={
                !txList?.rechargeList.length &&
                !txList?.withdrawList.length &&
                !txList?.list.length
                  ? index !== 0
                  : true
              }
            />
          ))}
        </>
      ) : null}

      <div ref={ref} />
    </div>
  );
};
