import React from 'react';
import { DisplayPoolReserveInfo } from '../../types';
import { formatApy, formatListNetWorth } from '../../utils/format';
import SymbolIcon from '../SymbolIcon';
import { useTranslation } from 'react-i18next';

export const SupplyItem = ({
  data,
  onSelect,
}: {
  data: DisplayPoolReserveInfo;
  onSelect: (data: DisplayPoolReserveInfo) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      key={`${data.reserve.underlyingAsset}-${data.reserve.symbol}`}
      className="mt-8 flex items-center justify-between px-12 py-14 rounded-[16px] bg-rb-neutral-bg-3 hover:bg-rb-neutral-bg-4"
    >
      <button
        type="button"
        className="flex-1 flex items-center justify-between min-w-0 text-left"
        onClick={() => onSelect(data)}
      >
        <div className="flex items-center gap-8 min-w-0">
          <SymbolIcon tokenSymbol={data.reserve.symbol} size={24} />
          <span className="text-[16px] leading-[20px] font-medium text-r-neutral-title-1 truncate max-w-[80px]">
            {data.reserve.symbol}
          </span>
        </div>
        <span className="text-[14px] leading-[18px] font-medium text-r-neutral-foot w-[80px] text-right flex-shrink-0">
          {formatListNetWorth(Number(data.reserve.totalLiquidityUSD || '0'))}
        </span>
        <span className="text-[16px] leading-[20px] font-medium text-rb-green-default w-[80px] text-right flex-shrink-0">
          {formatApy(Number(data.reserve.supplyAPY || '0'))}
        </span>
      </button>
      <button
        type="button"
        className="ml-8 px-16 py-8 rounded-[8px] bg-rb-neutral-bg-4 text-[14px] font-medium text-r-neutral-foot hover:bg-rb-neutral-bg-5 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(data);
        }}
      >
        {t('page.lending.supplyDetail.actions')}
      </button>
    </div>
  );
};
