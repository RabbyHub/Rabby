import React from 'react';
import { PositionSize } from '../../../types';

interface PositionSizeInputProps {
  positionSize: PositionSize;
  baseAsset: string;
  quoteAsset: string;
  precision: {
    amount: number;
    price: number;
  };
  onAmountChange: (amount: string) => void;
  onNotionalChange: (notional: string) => void;
}

export const PositionSizeInput: React.FC<PositionSizeInputProps> = ({
  positionSize,
  baseAsset,
  quoteAsset,
  precision,
  onAmountChange,
  onNotionalChange,
}) => {
  const formatNumber = (value: string, decimals: number): string => {
    if (!value || value === '') return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toFixed(decimals);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onAmountChange(value);
    }
  };

  const handleNotionalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onNotionalChange(value);
    }
  };

  return (
    <div className="flex items-center gap-[8px]">
      {/* Amount Input */}
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            value={positionSize.amount}
            onChange={handleAmountChange}
            placeholder="0"
            className="w-full h-[40px] p-12 rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none  font-medium"
          />
          <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            {baseAsset}
          </div>
        </div>
      </div>

      {/* Notional Value Input */}
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            value={positionSize.notionalValue}
            onChange={handleNotionalChange}
            placeholder="0"
            className="w-full h-[40px] p-12 rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium"
          />
          <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            {quoteAsset}
          </div>
        </div>
      </div>
    </div>
  );
};
