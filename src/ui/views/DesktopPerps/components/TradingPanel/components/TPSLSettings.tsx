import React from 'react';
import { TPSLConfig, TPSLInputMode } from '../../../types';

interface TPSLSettingsProps {
  config: TPSLConfig;
  hasPosition: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onInputModeChange: (mode: TPSLInputMode) => void;
  onTakeProfitChange: (field: 'price' | 'percentage', value: string) => void;
  onStopLossChange: (field: 'price' | 'percentage', value: string) => void;
}

export const TPSLSettings: React.FC<TPSLSettingsProps> = ({
  config,
  hasPosition,
  onEnabledChange,
  onInputModeChange,
  onTakeProfitChange,
  onStopLossChange,
}) => {
  const handleNumberInput = (value: string): boolean => {
    // Allow empty, numbers, decimal point, and minus sign at the start
    return value === '' || /^-?\d*\.?\d*$/.test(value);
  };

  const handleTPInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (handleNumberInput(value)) {
      onTakeProfitChange(
        config.inputMode === TPSLInputMode.PRICE ? 'price' : 'percentage',
        value
      );
    }
  };

  const handleSLInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (handleNumberInput(value)) {
      onStopLossChange(
        config.inputMode === TPSLInputMode.PRICE ? 'price' : 'percentage',
        value
      );
    }
  };

  return (
    <div className="space-y-[12px]">
      {/* TP Row */}
      <div className="flex items-center gap-[8px]">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={
                config.inputMode === TPSLInputMode.PRICE
                  ? config.takeProfit.price
                  : config.takeProfit.percentage
              }
              onChange={handleTPInputChange}
              placeholder="0"
              className="w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
            />
            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
              TP
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={config.takeProfit.percentage}
              onChange={(e) => onTakeProfitChange('percentage', e.target.value)}
              placeholder="0"
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

      {/* SL Row */}
      <div className="flex items-center gap-[8px]">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={
                config.inputMode === TPSLInputMode.PRICE
                  ? config.stopLoss.price
                  : config.stopLoss.percentage
              }
              onChange={handleSLInputChange}
              placeholder="0"
              className="w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
            />
            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
              SL
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={config.stopLoss.percentage}
              onChange={(e) => onStopLossChange('percentage', e.target.value)}
              placeholder="0"
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
    </div>
  );
};
