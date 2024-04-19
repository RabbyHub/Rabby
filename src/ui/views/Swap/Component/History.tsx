import { Popup, TokenWithChain } from '@/ui/component';
import React, { forwardRef, useMemo } from 'react';
import { useSwapHistory } from '../hooks';
import { SwapItem, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { CHAINS_LIST } from '@debank/common';
import { formatAmount, formatUsdValue, openInTab, sinceTime } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import ImgPending from 'ui/assets/swap/pending.svg';
import ImgCompleted from 'ui/assets/swap/completed.svg';
import ImgEmpty from 'ui/assets/swap/empty.svg';

import { ReactComponent as RcIconSwapArrow } from 'ui/assets/swap/arrow-right.svg';

import clsx from 'clsx';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ellipsis } from '@/ui/utils/address';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { findChain } from '@/utils/chain';

const TokenCost = ({
  payToken,
  receiveToken,
  payTokenAmount,
  receiveTokenAmount,
  loading = false,
  actual = false,
}: {
  payToken: TokenItem;
  receiveToken: TokenItem;
  payTokenAmount?: number;
  receiveTokenAmount?: number;
  loading?: boolean;
  actual?: boolean;
}) => {
  if (loading) {
    return (
      <SkeletonInput
        active
        style={{ minWidth: 220, width: '100%', height: 16 }}
      />
    );
  }
  return (
    <div
      className={clsx(
        'flex items-center text-13 text-r-neutral-title-1',
        !actual && 'opacity-60'
      )}
    >
      <TokenWithChain
        token={payToken}
        width="16px"
        height="16px"
        hideChainIcon
      />
      <div className="ml-6">
        {formatAmount(payTokenAmount || '0')} {getTokenSymbol(payToken)}
      </div>
      <RcIconSwapArrow className={clsx('w-[16px] h-[16px] mx-12')} />
      <TokenWithChain
        token={receiveToken}
        width="16px"
        height="16px"
        hideChainIcon
      />
      <div className="ml-6">
        {formatAmount(receiveTokenAmount || '0')} {getTokenSymbol(receiveToken)}
      </div>
    </div>
  );
};

interface TransactionProps {
  data: SwapItem;
}
const Transaction = forwardRef<HTMLDivElement, TransactionProps>(
  ({ data }, ref) => {
    const isPending = data.status === 'Pending';
    const isCompleted = data?.status === 'Completed';
    const time = data?.finished_at || data?.create_at;
    const targetDex = data?.dex_id;
    const txId = data?.tx_id;
    const chainItem = useMemo(
      () =>
        findChain({
          serverId: data?.chain,
        }),
      [data?.chain]
    );
    const chainName = chainItem?.name || '';
    const scanLink = useMemo(() => chainItem?.scanLink.replace('_s_', ''), [
      chainItem?.scanLink,
    ]);
    const loading = data?.status !== 'Finished';

    const gasUsed = useMemo(() => {
      if (data?.gas) {
        return `${formatAmount(data.gas.native_gas_fee)} ${getTokenSymbol(
          data?.gas.native_token
        )} (${formatUsdValue(data.gas.usd_gas_fee)})`;
      }
      return '';
    }, [data?.gas]);

    const gotoScan = React.useCallback(() => {
      if (scanLink && txId) {
        openInTab(scanLink + txId);
      }
    }, []);

    const slippagePercent = useMemo(
      () => new BigNumber(data.quote.slippage).times(100).toString(10) + '%',
      [data?.quote?.slippage]
    );
    const actualSlippagePercent = useMemo(
      () => new BigNumber(data?.actual?.slippage).times(100).toString(10) + '%',
      [data?.quote?.slippage]
    );

    const { t } = useTranslation();

    return (
      <div
        className={clsx(
          'bg-r-neutral-card-2 rounded-[6px] p-12 relative text-12 text-r-neutral-body'
        )}
        ref={ref}
      >
        <div className="flex justify-between items-center pb-8 border-b-[0.5px] border-solid border-rabby-neutral-line">
          <div className="flex items-center text-12 font-medium text-r-neutral-title-1">
            {isPending && (
              <TooltipWithMagnetArrow title={t('page.swap.pendingTip')}>
                <div className="flex items-center">
                  <img
                    src={ImgPending}
                    alt="loading"
                    className="w-[14px] h-[14px] animate-spin mr-6"
                  />
                  <span className="text-orange">{t('page.swap.Pending')}</span>
                </div>
              </TooltipWithMagnetArrow>
            )}
            {isCompleted && (
              <TooltipWithMagnetArrow title={t('page.swap.completedTip')}>
                <div className="flex items-center mr-6">
                  <img src={ImgCompleted} className="w-[14px] h-[14px] mr-6" />
                  <span>{t('page.swap.Completed')}</span>
                </div>
              </TooltipWithMagnetArrow>
            )}
            <span>{!isPending && sinceTime(time)}</span>
          </div>
          {!!targetDex && (
            <span className="text-12 font-medium text-r-neutral-title-1">
              {targetDex}
            </span>
          )}
        </div>

        <div className="flex items-center mt-12">
          <span className="w-[68px]">{t('page.swap.estimate')}</span>
          <div>
            <TokenCost
              payToken={data?.pay_token}
              receiveToken={data.receive_token}
              payTokenAmount={data.quote.pay_token_amount}
              receiveTokenAmount={data.quote.receive_token_amount}
            />
          </div>
        </div>

        <div className="flex items-center mt-[15px]">
          <span className="w-[68px]">{t('page.swap.actual')}</span>
          <div>
            <TokenCost
              payToken={data?.pay_token}
              receiveToken={data.receive_token}
              payTokenAmount={data.actual.pay_token_amount}
              receiveTokenAmount={data.actual.receive_token_amount}
              loading={loading}
              actual
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-[15px] mb-12">
          <div>
            {t('page.swap.slippage_tolerance')} <span>{slippagePercent}</span>
          </div>
          <div className="flex items-center">
            <span>{t('page.swap.actual-slippage')} </span>
            {loading ? (
              <SkeletonInput className="w-[52px] h-[18px]" active />
            ) : (
              <span>{actualSlippagePercent}</span>
            )}
          </div>
        </div>

        <div className="flex items-center text-12 text-r-neutral-foot pt-10 border-t-[0.5px] border-solid border-rabby-neutral-line">
          <span className="cursor-pointer" onClick={gotoScan}>
            {chainName}:{' '}
            <span className="underline underline-r-neutral-foot">
              {ellipsis(txId)}
            </span>
          </span>

          {!loading ? (
            <span className="ml-auto">
              {t('page.swap.gas-fee', { gasUsed })}
            </span>
          ) : (
            <span className="ml-auto">
              {t('page.swap.gas-x-price', {
                price: data?.gas?.gas_price || '',
              })}
            </span>
          )}
        </div>
      </div>
    );
  }
);

const HistoryList = () => {
  const { txList, loading, loadingMore, ref } = useSwapHistory();
  const { t } = useTranslation();
  if (!loading && (!txList || !txList?.list?.length)) {
    return (
      <div className="w-full h-full flex flex-col items-center">
        <img
          src={ImgEmpty}
          className="w-[52px] h-[52px] mx-auto mt-[112px] mb-24"
        />
        <p className="text-center text-r-neutral-foot text-14">
          {t('page.swap.no-transaction-records')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[434px] space-y-[12px] pb-20">
      {txList?.list?.map((swap, idx) => (
        <Transaction
          ref={txList?.list.length - 1 === idx ? ref : undefined}
          key={`${swap.tx_id}-${swap.chain}`}
          data={swap}
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

export const SwapTxHistory = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Popup
      visible={visible}
      title={t('page.swap.swap-history')}
      height={494}
      onClose={onClose}
      closable
      bodyStyle={{
        paddingTop: 16,
        paddingBottom: 0,
      }}
      destroyOnClose
      isSupportDarkMode
    >
      <HistoryList />
    </Popup>
  );
};
