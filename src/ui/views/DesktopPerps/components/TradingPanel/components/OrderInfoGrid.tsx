import React from 'react';
import { OrderSideInfo, SizeDisplayUnit } from '../../../types';
import { formatPerpsCoin } from '../../../utils';
import { useTranslation } from 'react-i18next';
interface OrderInfoGridProps {
  buy: OrderSideInfo;
  sell: OrderSideInfo;
  displayUnit: SizeDisplayUnit;
  selectedCoin: string;
  reduceOnly?: boolean;
}

export const OrderInfoGrid: React.FC<OrderInfoGridProps> = ({
  buy,
  sell,
  displayUnit,
  selectedCoin,
  reduceOnly,
}) => {
  const { t } = useTranslation();
  const maxUnit =
    displayUnit === 'base' ? formatPerpsCoin(selectedCoin) : 'USDC';

  return (
    <div className="space-y-[6px]">
      {/* Liq. Price row (hidden when reduceOnly) */}
      {!reduceOnly && (
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
            {buy.max} {maxUnit}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-4">
          <span className="text-rb-neutral-secondary text-[12px]">
            {t('page.perpsPro.tradingPanel.max')}
          </span>
          <span className="text-rb-neutral-title-1 font-medium text-[12px]">
            {sell.max} {maxUnit}
          </span>
        </div>
      </div>
    </div>
  );
};
