import React from 'react';
import { OrderSideInfo, SizeDisplayUnit } from '../../../types';
import { formatPerpsCoin } from '../../../utils';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import type { PerpsQuoteAsset } from '@/ui/views/Perps/constants';

interface OrderInfoGridProps {
  buy: OrderSideInfo;
  sell: OrderSideInfo;
  displayUnit: SizeDisplayUnit;
  selectedCoin: string;
  reduceOnly?: boolean;
  hideLiqPrice?: boolean;
  quoteAsset: PerpsQuoteAsset;
  price?: number | string;
}

export const OrderInfoGrid: React.FC<OrderInfoGridProps> = ({
  buy,
  sell,
  displayUnit,
  selectedCoin,
  reduceOnly,
  hideLiqPrice,
  price,
  quoteAsset,
}) => {
  const { t } = useTranslation();

  const formatMax = (max: string) => {
    if (displayUnit === 'usd' && price && Number(max) > 0) {
      return `${splitNumberByStep(
        new BigNumber(max).multipliedBy(price).toFixed(2)
      )} ${quoteAsset}`;
    }
    return `${max} ${formatPerpsCoin(selectedCoin)}`;
  };

  return (
    <div className="space-y-[6px]">
      {/* Liq. Price row (hidden when reduceOnly) */}
      {!reduceOnly && !hideLiqPrice && (
        <div className="flex items-baseline justify-between">
          <div className="flex-1 flex flex-wrap items-baseline gap-x-[4px]">
            <span className="text-rb-neutral-secondary text-[12px] whitespace-nowrap">
              {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
            </span>
            <span className="text-rb-neutral-title-1 font-medium text-[12px] whitespace-nowrap">
              {buy.liqPrice || '-'}
            </span>
          </div>
          <div className="flex-1 flex flex-wrap items-baseline justify-end gap-x-[4px]">
            <span className="text-rb-neutral-secondary text-[12px] whitespace-nowrap">
              {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
            </span>
            <span className="text-rb-neutral-title-1 font-medium text-[12px] whitespace-nowrap">
              {sell.liqPrice || '-'}
            </span>
          </div>
        </div>
      )}

      {/* Cost row */}
      <div className="flex items-baseline justify-between">
        <div className="flex-1 flex flex-wrap items-baseline gap-x-[4px]">
          <span className="text-rb-neutral-secondary text-[12px] whitespace-nowrap">
            {t('page.perpsPro.tradingPanel.cost')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px] whitespace-nowrap">
            {buy.cost}
          </span>
        </div>
        <div className="flex-1 flex flex-wrap items-baseline justify-end gap-x-[4px]">
          <span className="text-rb-neutral-secondary text-[12px] whitespace-nowrap">
            {t('page.perpsPro.tradingPanel.cost')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px] whitespace-nowrap">
            {sell.cost}
          </span>
        </div>
      </div>

      {/* Max row */}
      <div className="flex items-baseline justify-between">
        <div className="flex-1 flex flex-wrap items-baseline gap-x-[4px]">
          <span className="text-rb-neutral-secondary text-[12px] whitespace-nowrap">
            {t('page.perpsPro.tradingPanel.max')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px] whitespace-nowrap">
            {formatMax(buy.max)}
          </span>
        </div>
        <div className="flex-1 flex flex-wrap items-baseline justify-end gap-x-[4px]">
          <span className="text-rb-neutral-secondary text-[12px] whitespace-nowrap">
            {t('page.perpsPro.tradingPanel.max')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px] whitespace-nowrap">
            {formatMax(sell.max)}
          </span>
        </div>
      </div>
    </div>
  );
};
