import React from 'react';
import { SwapSlider } from '@/ui/views/Swap/Component/Slider';

interface PerpsSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onAfterChange?: (value: number) => void;
  showPercentage?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export const PerpsSlider: React.FC<PerpsSliderProps> = ({
  value,
  onValueChange,
  onAfterChange,
  disabled = false,
  showPercentage = true,
  min = 0,
  max = 100,
  step = 1,
}) => {
  return (
    <div className="flex items-center gap-16 relative w-full pl-4">
      <SwapSlider
        className="flex-1"
        value={value}
        onChange={onValueChange}
        onAfterChange={onAfterChange}
        min={min}
        max={max}
        step={step}
        tooltipVisible={false}
        disabled={disabled}
      />
      {showPercentage && (
        <div className="text-13 text-r-blue-default font-medium">{value}%</div>
      )}
    </div>
  );
};
