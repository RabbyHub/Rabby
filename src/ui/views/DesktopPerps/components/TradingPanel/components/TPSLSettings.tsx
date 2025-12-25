import React from 'react';
import { TPSLConfig, OrderSide } from '../../../types';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import clsx from 'clsx';

interface TPSLSettingsProps {
  config: TPSLConfig;
  szDecimals: number;
  noSizeTradeAmount: boolean;
  onTakeProfitChange: (field: 'price' | 'percentage', value: string) => void;
  onStopLossChange: (field: 'price' | 'percentage', value: string) => void;
}

export const TPSLSettings: React.FC<TPSLSettingsProps> = ({
  config,
  szDecimals,
  noSizeTradeAmount,
  onTakeProfitChange,
  onStopLossChange,
}) => {
  const validatePercentageInput = (value: string): boolean => {
    // Allow empty, numbers, decimal point, and minus sign at the start
    return value === '' || /^-?\d*\.?\d*$/.test(value);
  };

  const handleTPPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      onTakeProfitChange('price', value);
    }
  };

  const handleTPPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePercentageInput(value)) {
      onTakeProfitChange('percentage', value);
    }
  };

  const handleSLPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      onStopLossChange('price', value);
    }
  };

  const handleSLPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePercentageInput(value)) {
      onStopLossChange('percentage', value);
    }
  };

  return (
    <div className="space-y-[12px]">
      {/* TP Row */}
      <div className="space-y-[4px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.takeProfit.price}
                onChange={handleTPPriceChange}
                placeholder=""
                className={clsx(
                  'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                  config.takeProfit.error
                    ? 'border-rb-red-default text-rb-red-default'
                    : 'border-rb-neutral-line text-r-neutral-title-1'
                )}
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                TP
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.takeProfit.percentage}
                onChange={handleTPPercentageChange}
                placeholder=""
                className="w-full h-[40px] pl-[44px] pr-[24px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                Gain
              </div>
              <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                %
              </div>
            </div>
          </div>
        </div>
        {config.takeProfit.error && (
          <div className="text-[12px] text-rb-red-default px-[4px]">
            {config.takeProfit.error}
          </div>
        )}
      </div>

      {/* SL Row */}
      <div className="space-y-[4px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.stopLoss.price}
                onChange={handleSLPriceChange}
                placeholder=""
                className={clsx(
                  'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                  config.stopLoss.error
                    ? 'border-rb-red-default text-rb-red-default'
                    : 'border-rb-neutral-line text-r-neutral-title-1'
                )}
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                SL
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                disabled={noSizeTradeAmount}
                type="text"
                value={config.stopLoss.percentage}
                onChange={handleSLPercentageChange}
                placeholder=""
                className="w-full h-[40px] pl-[44px] pr-[24px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                Loss
              </div>
              <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                %
              </div>
            </div>
          </div>
        </div>
        {config.stopLoss.error && (
          <div className="text-[12px] text-rb-red-default px-[4px]">
            {config.stopLoss.error}
          </div>
        )}
      </div>
    </div>
  );
};
