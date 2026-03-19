import React from 'react';
import { OrderSideInfo, SizeDisplayUnit } from '../../../types';
import { formatPerpsCoin } from '../../../utils';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';

interface OrderInfoGridProps {
  buy: OrderSideInfo;
  sell: OrderSideInfo;
  displayUnit: SizeDisplayUnit;
  selectedCoin: string;
  reduceOnly?: boolean;
  hideLiqPrice?: boolean;
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
}) => {
  const { t } = useTranslation();

  const formatMax = (max: string) => {
    if (displayUnit === 'usdc' && price && Number(max) > 0) {
      return formatUsdValue(new BigNumber(max).multipliedBy(price).toNumber());
    }
    return `${max} ${formatPerpsCoin(selectedCoin)}`;
  };

  return (
    <div className="space-y-[6px]">
      {/* Liq. Price row (hidden when reduceOnly) */}
      {!reduceOnly && !hideLiqPrice && (
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            <span className="text-rb-neutral-secondary text-[12px]">
              {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
            </span>
            <span className="text-rb-neutral-title-1 font-medium text-[12px]">
              {buy.liqPrice || '-'}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-end gap-4">
            <span className="text-rb-neutral-secondary text-[12px]">
              {t('page.perpsDetail.PerpsEditMarginPopup.liqPrice')}
            </span>
            <span className="text-rb-neutral-title-1 font-medium text-[12px]">
              {sell.liqPrice || '-'}
            </span>
          </div>
        </div>
      )}

      {/* Cost row */}
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center gap-4">
          <span className="text-rb-neutral-secondary text-[12px]">
            {t('page.perpsPro.tradingPanel.cost')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px]">
            {buy.cost}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-4">
          <span className="text-rb-neutral-secondary text-[12px]">
            {t('page.perpsPro.tradingPanel.cost')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px]">
            {sell.cost}
          </span>
        </div>
      </div>

      {/* Max row */}
      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center gap-4">
          <span className="text-rb-neutral-secondary text-[12px]">
            {t('page.perpsPro.tradingPanel.max')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px]">
            {formatMax(buy.max)}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-4">
          <span className="text-rb-neutral-secondary text-[12px]">
            {t('page.perpsPro.tradingPanel.max')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px]">
            {formatMax(sell.max)}
          </span>
        </div>
      </div>
    </div>
  );
};
