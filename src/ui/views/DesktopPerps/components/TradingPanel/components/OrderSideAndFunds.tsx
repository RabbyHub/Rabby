import React from 'react';
import { OrderSide, Position } from '../../../types';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import clsx from 'clsx';

interface OrderSideAndFundsProps {
  orderSide: OrderSide;
  switchOrderSide: (side: OrderSide) => void;
  availableBalance: number;
  currentPosition: Position | null;
  selectedCoin: string;
}

export const OrderSideAndFunds: React.FC<OrderSideAndFundsProps> = ({
  orderSide,
  switchOrderSide,
  availableBalance,
  currentPosition,
  selectedCoin,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-[8px]">
        <button
          onClick={() => switchOrderSide(OrderSide.BUY)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.BUY
              ? 'bg-rb-green-default text-rb-neutral-InvertHighlight '
              : 'bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.buyLong')}
        </button>
        <button
          onClick={() => switchOrderSide(OrderSide.SELL)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.SELL
              ? 'bg-rb-red-default text-rb-neutral-InvertHighlight '
              : 'bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.sellShort')}
        </button>
      </div>

      {/* Available Funds & Current Position */}
      <div className="space-y-[4px]">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px] font-medium">
            {t('page.perpsPro.tradingPanel.availableFunds')}
          </span>
          <span className="text-r-neutral-title-1 text-[12px] font-medium">
            {formatUsdValue(availableBalance)} USDC
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px] font-medium">
            {t('page.perpsPro.tradingPanel.currentPosition')}
          </span>
          <span
            className={clsx(
              'text-r-neutral-title-1 text-[12px] font-medium',
              {
                Long: 'text-rb-green-default',
                Short: 'text-rb-red-default',
              }[currentPosition?.side || '']
            )}
          >
            {currentPosition
              ? `${currentPosition.size} ${selectedCoin}`
              : `0 ${selectedCoin}`}
          </span>
        </div>
      </div>
    </>
  );
};
