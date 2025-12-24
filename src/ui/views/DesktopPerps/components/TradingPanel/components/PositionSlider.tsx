import React from 'react';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';

interface PositionSliderProps {
  percentage: number;
  onChange: (percentage: number) => void;
}

const PRESET_POINTS = [0, 25, 50, 75, 100];

export const PositionSlider: React.FC<PositionSliderProps> = ({
  percentage,
  onChange,
}) => {
  const [inputValue, setInputValue] = React.useState<string>(
    percentage.toString()
  );

  React.useEffect(() => {
    setInputValue(percentage.toString());
  }, [percentage]);

  const handleSliderChange = (value: number) => {
    onChange(value);
  };

  const handlePresetClick = (value: number) => {
    onChange(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '') {
      setInputValue('0');
      onChange(0);
      return;
    }

    let numValue = parseInt(inputValue, 10);
    // Clamp value between 0 and 100
    if (numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;

    setInputValue(numValue.toString());
    onChange(numValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-start gap-[20px]">
      {/* Slider with preset points */}
      <div className="flex-1 space-y-[6px]">
        <DesktopPerpsSlider
          min={0}
          max={100}
          value={percentage}
          onChange={handleSliderChange}
          step={1}
          tooltipVisible={false}
        />
        {/* Preset Points */}
        <div className="flex items-center justify-between">
          {PRESET_POINTS.map((point) => (
            <button
              key={point}
              onClick={() => handlePresetClick(point)}
              className="text-[11px] text-r-neutral-foot transition-colors hover:text-r-blue-default"
            >
              {point}%
            </button>
          ))}
        </div>
      </div>

      {/* Percentage input */}
      <div className="flex items-center justify-between p-8 gap-[2px] h-[28px] w-[52px] shrink-0 border border-solid border-rb-neutral-line rounded-[8px] ">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="w-[24px] text-[12px] text-rb-neutral-title-1 font-medium text-left bg-transparent border-none outline-none focus:outline-none px-0"
        />
        <span className="text-[12px] text-rb-neutral-foot font-medium">%</span>
      </div>
    </div>
  );
};
