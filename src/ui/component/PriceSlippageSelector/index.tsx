import React, { useState, useRef } from 'react';
import { Input } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import './style.less';

interface PriceSlippageSelectorProps {
  onChange(value: number): void;
  value: number;
}

const PriceSlippageSelector = ({
  value,
  onChange,
}: PriceSlippageSelectorProps) => {
  const options = [0.5, 1, 3];
  const customInput = useRef<Input>(null);
  const { t } = useTranslation();
  const [selectSlippage, setSelectSlippage] = useState(
    options.includes(value) ? value : 'custom'
  );
  const [customValue, setCustomValue] = useState<string | null>(
    selectSlippage === 'custom' ? value.toString() : null
  );

  const handleCustomValueChange = (val: string) => {
    if (/^\d*(\.\d*)?$/.test(val) && Number(val) <= 50) {
      setCustomValue(val);
      if (selectSlippage === 'custom') {
        onChange(Number(val));
      }
    }
  };

  const handleSlippageChange = (value: number | string) => {
    setSelectSlippage(value);
    if (value === 'custom') {
      customInput.current?.focus();
    } else {
      onChange(Number(value));
    }
  };

  const handleFocusCustomInput = () => {
    setSelectSlippage('custom');
    if (!customValue) {
      setCustomValue('3');
      onChange(3);
    } else {
      onChange(Number(customValue));
    }
  };

  return (
    <div className="price-slippage">
      {options.map((option) => (
        <div
          className={clsx('price-slippage__item', {
            active: selectSlippage === option,
          })}
          key={option}
          onClick={() => handleSlippageChange(option)}
        >
          {option}%
        </div>
      ))}
      <div
        className={clsx('price-slippage__item', {
          active: selectSlippage === 'custom',
        })}
        onClick={() => handleSlippageChange('custom')}
      >
        <Input
          value={customValue?.toString()}
          onChange={(e) => handleCustomValueChange(e.target.value)}
          onFocus={handleFocusCustomInput}
          placeholder={t('Custom')}
          ref={customInput}
        />
        {customValue && <span className="percent">%</span>}
      </div>
    </div>
  );
};

export default PriceSlippageSelector;
