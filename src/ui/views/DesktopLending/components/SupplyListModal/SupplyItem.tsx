import React, { useMemo } from 'react';
import clsx from 'clsx';
import { DisplayPoolReserveInfo } from '../../types';
import { formatApy, formatListNetWorth } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, isSameAddress } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Tooltip } from 'antd';
import { useSelectedMarket } from '../../hooks/market';
import wrapperToken from '../../config/wrapperToken';

export const SupplyItem = ({
  data,
  onSelect,
  className,
  noBg = false,
}: {
  data: DisplayPoolReserveInfo;
  onSelect: (data: DisplayPoolReserveInfo) => void;
  noBg?: boolean;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { chainEnum } = useSelectedMarket();
  const disableSupplyButton = useMemo(() => {
    if (!data) {
      return false;
    }
    const bgTotalLiquidity = new BigNumber(data.reserve.totalLiquidity || '0');
    if (bgTotalLiquidity.gte(data?.reserve?.supplyCap || '0')) {
      return true;
    }
    return !data?.walletBalance || data.walletBalance === '0';
  }, [data]);
  const upToCap = useMemo(() => {
    if (!data) {
      return false;
    }
    const bgTotalLiquidity = new BigNumber(data.reserve.totalLiquidity || '0');
    return bgTotalLiquidity.gte(data?.reserve?.supplyCap || '0');
  }, [data]);

  const isWrapperToken = useMemo(() => {
    return chainEnum
      ? isSameAddress(
          wrapperToken[chainEnum]?.address,
          data.reserve.underlyingAsset
        )
      : false;
  }, [data.reserve.underlyingAsset, chainEnum]);

  return (
    <div
      key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
      className={clsx(
        'mt-8 flex items-center justify-between px-16 h-[56px] rounded-[12px]',
        noBg
          ? ''
          : isWrapperToken
          ? 'bg-r-neutral-line relative'
          : 'bg-rb-neutral-bg-1',
        className
      )}
    >
      {isWrapperToken && (
        <div
          className="absolute left-[20px] top-[-6px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px]"
          style={{
            borderBottomColor: 'var(--r-neutral-line)',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />
      )}
      <div className="flex-1 flex items-center justify-start min-w-0 text-left">
        <div className="flex items-center gap-8 min-w-0 w-[150px]">
          <SymbolIcon tokenSymbol={data.reserve.symbol} size={24} />
          <span
            className={clsx(
              'text-[13px] leading-[20px] font-medium text-r-neutral-title-1',
              'truncate max-w-[80px]'
            )}
          >
            {data.reserve.symbol}
          </span>
        </div>
        <span
          className={clsx(
            'text-[13px] leading-[18px] font-medium text-r-neutral-title-1 w-[150px]',
            'flex-shrink-0 text-right'
          )}
        >
          {formatListNetWorth(Number(data.reserve.totalLiquidityUSD || '0'))}
        </span>
        <span
          className={clsx(
            'text-[13px] leading-[20px] font-medium text-rb-green-default w-[150px]',
            'flex-shrink-0 text-right'
          )}
        >
          {formatApy(Number(data.reserve.supplyAPY || '0'))}
        </span>
        <span
          className={clsx(
            'text-[13px] leading-[20px] font-medium text-r-neutral-title-1 w-[150px]',
            'flex-shrink-0 text-right'
          )}
        >
          {formatUsdValue(Number(data.walletBalanceUSD || '0'))}
        </span>
      </div>
      {disableSupplyButton ? (
        <Tooltip
          overlayClassName="rectangle"
          title={
            upToCap
              ? t('page.lending.supplyOverview.reachCap')
              : t('page.lending.supplyOverview.noBalance')
          }
        >
          <button
            type="button"
            disabled
            className={clsx(
              'min-w-[120px] h-[36px] flex items-center justify-center rounded-[6px] flex-shrink-0',
              'bg-rb-neutral-bg-2 text-[13px] font-medium text-r-neutral-title-1',
              'opacity-50 bg-rb-neutral-bg-4'
            )}
          >
            {t('page.lending.supplyDetail.actions')}
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          disabled={disableSupplyButton}
          className={clsx(
            'min-w-[120px] h-[36px] flex items-center justify-center rounded-[6px] flex-shrink-0',
            'bg-rb-neutral-bg-2 text-[13px] font-medium text-r-neutral-title-1',
            !disableSupplyButton && 'hover:bg-rb-brand-light-1',
            disableSupplyButton && 'opacity-50 bg-rb-neutral-bg-4'
          )}
          onClick={() => {
            onSelect(data);
          }}
        >
          {t('page.lending.supplyDetail.actions')}
        </button>
      )}
    </div>
  );
};
