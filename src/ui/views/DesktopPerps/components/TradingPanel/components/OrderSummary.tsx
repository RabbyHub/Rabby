import React from 'react';
import { OrderSummaryData } from '../../../types';
import { useTranslation } from 'react-i18next';
import { DashedUnderlineText } from '../../DashedUnderlineText';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { formatUsdValue } from '@/ui/utils';

interface OrderSummaryProps {
  data: OrderSummaryData;
  showTPSLExpected?: boolean;
  tpExpectedPnL?: number;
  slExpectedPnL?: number;
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
          {Boolean(tpExpectedPnL) && (
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot text-[12px]">
                {t('page.perpsPro.tradingPanel.takeProfitExpectedPnL')}
              </span>
              <span
                className={clsx(
                  'font-medium text-[12px]',
                  tpExpectedPnL && tpExpectedPnL < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {tpExpectedPnL && tpExpectedPnL >= 0 ? '+' : '-'}
                {formatUsdValue(Math.abs(tpExpectedPnL!))}
              </span>
            </div>
          )}
          {Boolean(slExpectedPnL) && (
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot text-[12px]">
                {t('page.perpsPro.tradingPanel.stopLossExpectedPnL')}
              </span>
              <span
                className={clsx(
                  'font-medium text-[12px]',
                  slExpectedPnL && slExpectedPnL <= 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {slExpectedPnL && slExpectedPnL <= 0 ? '-' : '+'}
                {formatUsdValue(Math.abs(slExpectedPnL!))}
              </span>
            </div>
          )}
        </>
      )}

      {/* Est. Liq. Price */}
      <div className="flex items-center justify-between">
        {data.liquidationPrice ? (
          <span className="text-r-neutral-foot text-[12px]">
            {t('page.perpsPro.tradingPanel.liquidationPrice')}
          </span>
        ) : (
          <Tooltip
            title={t('page.perpsPro.tradingPanel.liquidationPriceTooltip')}
            overlayClassName="rectangle"
            placement="top"
            trigger="hover"
          >
            <span className="text-r-neutral-foot text-[12px]">
              {t('page.perpsPro.tradingPanel.liquidationPrice')}
            </span>
          </Tooltip>
        )}
        <span className="text-r-neutral-title-1 font-medium text-[12px]">
          {data.liquidationPrice || '-'}
        </span>
      </div>

      {/* Order Value */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[12px]">
          {t('page.perpsPro.tradingPanel.orderValue')}
        </span>
        <span className="text-r-neutral-title-1 font-medium text-[12px]">
          {data.orderValue}
        </span>
      </div>

      {/* Margin Required */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[12px]">
          {t('page.perpsPro.tradingPanel.marginRequired')}
        </span>
        <span className="text-r-neutral-title-1 font-medium text-[12px]">
          {data.marginRequired}
        </span>
      </div>

      {/* Margin Usage */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[12px]">
          {t('page.perpsPro.tradingPanel.marginUsage')}
        </span>
        <span className="text-r-neutral-title-1 font-medium text-[12px]">
          {data.marginUsage}
        </span>
      </div>

      {/* Slippage */}
      {data.slippage && (
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px]">
            {t('page.perpsPro.tradingPanel.slippage')}
          </span>
          <DashedUnderlineText
            onClick={() => {
              handleSetSlippage?.();
            }}
            className="text-r-neutral-title-1 font-medium text-[12px]"
          >
            {data.slippage}
          </DashedUnderlineText>
        </div>
      )}
    </div>
  );
};
