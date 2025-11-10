import React from 'react';
import { Slider } from 'antd';
import './index.less';

interface PerpsSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  showPercentage?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export const PerpsSlider: React.FC<PerpsSliderProps> = ({
  value,
  onValueChange,
  disabled = false,
  showPercentage = true,
  min = 0,
  max = 100,
  step = 1,
}) => {
  return (
    <div className="perps-slider-container">
      <div className="perps-slider-wrapper">
        <Slider
          value={value}
          onChange={onValueChange}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
        />
      </div>
      {showPercentage && (
        <span className="perps-slider-percentage">{value.toFixed(0)}%</span>
      )}
    </div>
  );
};
