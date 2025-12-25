import React from 'react';
import { OrderSummaryData } from '../../../types';

interface OrderSummaryProps {
  data: OrderSummaryData;
  showTPSLExpected?: boolean;
  tpExpectedPnL?: string;
  slExpectedPnL?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  data,
  showTPSLExpected,
  tpExpectedPnL,
  slExpectedPnL,
}) => {
  return (
    <div className="space-y-[6px] font-medium">
      {/* TP/SL Expected PnL */}
      {showTPSLExpected && (
        <>
          {tpExpectedPnL && (
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot text-[13px]">
                Take profit expected PnL
              </span>
              <span className="text-r-green-default text-[13px]">
                {tpExpectedPnL}
              </span>
            </div>
          )}
          {slExpectedPnL && (
            <div className="flex items-center justify-between">
              <span className="text-r-neutral-foot text-[13px]">
                Stop loss expected PnL
              </span>
              <span className="text-r-red-default text-[13px]">
                {slExpectedPnL}
              </span>
            </div>
          )}
        </>
      )}

      {/* Est. Liq. Price */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">Est. Liq. Price</span>
        <span className="text-r-neutral-title-1 text-[13px]">
          {data.liquidationPrice}
        </span>
      </div>

      {/* Order Value */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">Order Value</span>
        <span className="text-r-neutral-title-1 text-[13px]">
          {data.orderValue}
        </span>
      </div>

      {/* Margin Required */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">Margin Required</span>
        <span className="text-r-neutral-title-1 text-[13px]">
          {data.marginRequired}
        </span>
      </div>

      {/* Margin Usage */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">Margin Usage</span>
        <span className="text-r-neutral-title-1 text-[13px]">
          {data.marginUsage}
        </span>
      </div>

      {/* Slippage */}
      <div className="flex items-center justify-between">
        <span className="text-r-neutral-foot text-[13px]">Slippage</span>
        <span className="text-r-neutral-title-1 text-[13px]">
          {data.slippage}
        </span>
      </div>
    </div>
  );
};
