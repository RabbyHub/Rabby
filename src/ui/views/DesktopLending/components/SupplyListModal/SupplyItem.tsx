import React, { useMemo } from 'react';
import clsx from 'clsx';
import { DisplayPoolReserveInfo } from '../../types';
import { formatApy, formatListNetWorth } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Tooltip } from 'antd';

export const SupplyItem = ({
  data,
  onSelect,
}: {
  data: DisplayPoolReserveInfo;
  onSelect: (data: DisplayPoolReserveInfo) => void;
}) => {
  const { t } = useTranslation();
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
  return (
    <div
      key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
      className={clsx(
        'mt-8 flex items-center justify-between px-16 h-[56px] rounded-[12px]',
        'bg-rb-neutral-bg-1'
      )}
    >
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
      {upToCap ? (
        <Tooltip
          overlayClassName="rectangle"
          title={t('page.lending.supplyOverview.reachCap')}
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
            !disableSupplyButton &&
              'hover:bg-rb-brand-light-1 hover:text-rb-brand-default',
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
