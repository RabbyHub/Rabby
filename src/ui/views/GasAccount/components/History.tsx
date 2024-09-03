import React from 'react';
import { ReactComponent as RcIconEmptyCC } from '@/ui/assets/empty-cc.svg';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, sinceTime } from '@/ui/utils';
import clsx from 'clsx';
import { useGasAccountHistory } from '../hooks';
import { Skeleton } from 'antd';
import { ReactComponent as RcIconPendingCC } from '@/ui/assets/pending-cc.svg';
import { ReactComponent as RcIconOpenExternalCC } from '@/ui/assets/open-external-cc.svg';
import { findChainByServerID } from '@/utils/chain';

const HistoryItem = ({
  time,
  isPending = false,
  value = 0,
  sign = '-',
  className,
  borderT = false,
  chainServerId,
  txId,
}: {
  time: number;
  value: number;
  sign: string;
  className?: string;
  isPending?: boolean;
  borderT?: boolean;
  chainServerId?: string;
  txId?: string;
}) => {
  const { t } = useTranslation();

  const gotoTxDetail = () => {
    if (chainServerId && txId) {
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
        isPending ? 'px-16 py-12' : 'px-16 py-18',
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
          <div>{t('page.gasAccount.deposit')}</div>
          <RcIconOpenExternalCC viewBox="0 0 12 12" className="w-12 h-12" />
        </div>
      ) : (
        <div className="text-13 text-r-neutral-foot">{sinceTime(time)}</div>
      )}
      <div className="text-13 font-medium text-r-neutral-title-1">
        {sign}
        {formatUsdValue(value)}{' '}
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
        'px-16 py-18'
      )}
    >
      <Skeleton.Input className="rounded w-[68px] h-[16px]" active />
      <Skeleton.Input className="rounded w-[40px] h-[16px]" active />
    </div>
  );
};

export const GasAccountHistory = () => {
  const { t } = useTranslation();

  const { loading, txList, loadingMore, ref } = useGasAccountHistory();

  if (!loading && !txList?.rechargeList.length && !txList?.list.length) {
    return (
      <div className="bg-r-neutral-card-1 h-[283px] flex flex-col gap-8 items-center rounded-[8px]">
        <RcIconEmptyCC
          viewBox="0 0 40 40"
          className="w-28 h-28 mt-[90px] text-r-neutral-foot"
        />
        <span className="text-13 font-medium text-r-neutral-foot">
          {t('page.gasAccount.history.noHistory')}
        </span>
      </div>
    );
  }
  return (
    <div className="bg-r-neutral-card-1 flex flex-col rounded-[8px] mb-20">
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
        txList?.list.map((item, index) => (
          <HistoryItem
            key={item.create_at}
            time={item.create_at}
            value={item.usd_value}
            sign={'-'}
            borderT={!txList?.rechargeList.length ? index !== 0 : true}
          />
        ))}

      {(loading && !txList) || loadingMore ? (
        <>
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingItem
              key={index}
              borderT={
                !txList?.rechargeList.length && !txList?.list.length
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
