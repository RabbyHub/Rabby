import React from 'react';
import { OrderSummaryData } from '../../../types';
import { useTranslation } from 'react-i18next';
import { DashedUnderlineText } from '../../DashedUnderlineText';

interface OrderSummaryProps {
  data: OrderSummaryData;
  showTPSLExpected?: boolean;
  tpExpectedPnL?: string;
  slExpectedPnL?: string;
  handleSetSlippage?: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  data,
  showTPSLExpected,
  tpExpectedPnL,
  slExpectedPnL,
  handleSetSlippage,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-[6px]">
      {/* TP/SL Expected PnL */}
      {showTPSLExpected && (
        <>
          {tpExpectedPnL && (
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot text-[13px]">
                {t('page.perpsPro.tradingPanel.takeProfitExpectedPnL')}
              </span>
              <span className="text-r-green-default font-medium text-[13px]">
                {tpExpectedPnL}
              </span>
            </div>
          )}
          {slExpectedPnL && (
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot text-[13px]">
                {t('page.perpsPro.tradingPanel.stopLossExpectedPnL')}
              </span>
              <span className="text-r-red-default font-medium text-[13px]">
                {slExpectedPnL}
              </span>
            </div>
          )}
        </>
      )}

      {/* Est. Liq. Price */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">
          {t('page.perpsPro.tradingPanel.liquidationPrice')}
        </span>
        {}
        <span className="text-r-neutral-title-1 font-medium text-[13px]">
          {data.liquidationPrice || '-'}
        </span>
      </div>

      {/* Order Value */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">
          {t('page.perpsPro.tradingPanel.orderValue')}
        </span>
        <span className="text-r-neutral-title-1 font-medium text-[13px]">
          {data.orderValue}
        </span>
      </div>

      {/* Margin Required */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">
          {t('page.perpsPro.tradingPanel.marginRequired')}
        </span>
        <span className="text-r-neutral-title-1 font-medium text-[13px]">
          {data.marginRequired}
        </span>
      </div>

      {/* Margin Usage */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">
          {t('page.perpsPro.tradingPanel.marginUsage')}
        </span>
        <span className="text-r-neutral-title-1 font-medium text-[13px]">
          {data.marginUsage}
        </span>
      </div>

      {/* Slippage */}
      {data.slippage && (
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.slippage')}
          </span>
          <DashedUnderlineText
            onClick={() => {
              handleSetSlippage?.();
            }}
            className="text-r-neutral-title-1 font-medium text-[13px]"
          >
            {data.slippage}
          </DashedUnderlineText>
        </div>
      )}
    </div>
  );
};
