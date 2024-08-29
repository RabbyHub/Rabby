import { Popup } from '@/ui/component';
import React, { forwardRef, useMemo } from 'react';
import { useBridgeHistory } from '../hooks';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { formatAmount, formatUsdValue, openInTab, sinceTime } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import ImgPending from 'ui/assets/swap/pending.svg';
import { ReactComponent as RCIconCCEmpty } from 'ui/assets/bridge/empty-cc.svg';

import { ReactComponent as RcIconSwapArrow } from 'ui/assets/swap/arrow-right.svg';

import clsx from 'clsx';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { ellipsis } from '@/ui/utils/address';
import { useTranslation } from 'react-i18next';
import { findChain } from '@/utils/chain';
import { BridgeHistory } from '@/background/service/openapi';

const BridgeTokenIcon = (props: { token: TokenItem }) => {
  const { token } = props;
  const chain = React.useMemo(() => {
    const chainServerId = token.chain;
    return findChain({
      serverId: chainServerId,
    });
  }, [token]);

  return (
    <div className="w-16 h-16 relative">
      <img className="w-16 h-16" src={token.logo_url} />
      <img
        className="w-12 h-12 absolute -right-4 -bottom-4"
        src={chain?.logo}
      />
    </div>
  );
};

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
    <div className={clsx('flex items-center text-13 text-r-neutral-title-1')}>
      <BridgeTokenIcon token={payToken} />
      <div className="ml-6">
        {formatAmount(payTokenAmount || '0')} {getTokenSymbol(payToken)}
      </div>
      <RcIconSwapArrow className={clsx('w-[16px] h-[16px] mx-12')} />
      <BridgeTokenIcon token={receiveToken} />
      <div className="ml-6">
        {formatAmount(receiveTokenAmount || '0')} {getTokenSymbol(receiveToken)}
      </div>
    </div>
  );
};

interface TransactionProps {
  data: BridgeHistory;
}
const Transaction = forwardRef<HTMLDivElement, TransactionProps>(
  ({ data }, ref) => {
    const isPending = data.status === 'pending';
    const isCompleted = data?.status === 'completed';
    const time =
      // data?.finished_at ||
      data?.create_at;

    const txId = data?.detail_url?.split('/').pop() || '';

    const loading = data?.status !== 'completed';

    const gasUsed = useMemo(() => {
      if (data?.from_gas) {
        return `${formatAmount(data.from_gas.gas_amount)} ${getTokenSymbol(
          data?.from_gas.native_token
        )} (${formatUsdValue(data.from_gas.usd_gas_fee)})`;
      }
      return '';
    }, [data?.from_gas]);

    const gotoScan = React.useCallback(() => {
      if (data?.detail_url) {
        openInTab(data?.detail_url);
      }
    }, []);

    const { t } = useTranslation();

    return (
      <div
        className={clsx(
          'bg-r-neutral-card-1 rounded-[6px] p-12 relative text-12 text-r-neutral-body'
        )}
        ref={ref}
      >
        <div className="flex justify-between items-center pb-8 border-b-[0.5px] border-solid border-rabby-neutral-line">
          <div className="flex items-center text-12 font-medium text-r-neutral-title-1">
            {isPending && (
              <TooltipWithMagnetArrow title={t('page.bridge.pendingTip')}>
                <div className="flex items-center">
                  <img
                    src={ImgPending}
                    alt="loading"
                    className="w-[14px] h-[14px] animate-spin mr-6"
                  />
                  <span className="text-orange">
                    {t('page.bridge.Pending')}
                  </span>
                </div>
              </TooltipWithMagnetArrow>
            )}

            <span>{!isPending && sinceTime(time)}</span>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={data.aggregator.logo_url}
              className="w-16 h-16 rounded-full"
            />
            <span className="text-13 font-medium text-r-neutral-title1 rounded-full">
              {data.aggregator.name}
            </span>
            <span>
              {t('page.bridge.via-bridge', {
                bridge: data?.bridge?.name || '',
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center mt-12">
          <span className="w-[68px]">{t('page.bridge.estimate')}</span>
          <div>
            <TokenCost
              payToken={data?.from_token}
              receiveToken={data.to_token}
              payTokenAmount={data.quote.pay_token_amount}
              receiveTokenAmount={data.quote.receive_token_amount}
            />
          </div>
        </div>

        <div className="flex items-center py-[15px]">
          <span className="w-[68px]">{t('page.bridge.actual')}</span>
          <div>
            <TokenCost
              payToken={data?.from_token}
              receiveToken={data.to_token}
              payTokenAmount={data.actual.pay_token_amount}
              receiveTokenAmount={data.actual.receive_token_amount}
              loading={loading}
              actual
            />
          </div>
        </div>

        <div className="flex items-center text-12 text-r-neutral-foot pt-10 border-t-[0.5px] border-solid border-rabby-neutral-line">
          <span className="cursor-pointer" onClick={gotoScan}>
            {t('page.bridge.detail-tx')}:{' '}
            <span className="underline underline-r-neutral-foot">
              {txId ? ellipsis(txId) : ''}
            </span>
          </span>

          {!loading ? (
            <span className="ml-auto">
              {t('page.bridge.gas-fee', { gasUsed })}
            </span>
          ) : (
            <span className="ml-auto">
              {t('page.bridge.gas-x-price', {
                price: data?.from_gas?.gas_price || '',
              })}
            </span>
          )}
        </div>
      </div>
    );
  }
);

const HistoryList = () => {
  const { txList, loading, loadingMore, ref } = useBridgeHistory();
  const { t } = useTranslation();

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

export const BridgeTxHistory = ({
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
      title={t('page.bridge.history')}
      height="70%"
      onClose={onClose}
      closable
      bodyStyle={{
        paddingTop: 16,
        paddingBottom: 0,
      }}
      destroyOnClose
      isSupportDarkMode
      isNew
    >
      <HistoryList />
    </Popup>
  );
};
