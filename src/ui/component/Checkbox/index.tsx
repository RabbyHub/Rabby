import React, { ReactNode, SyntheticEvent, useEffect, useState } from 'react';
import IconCheck from 'ui/assets/check.svg';
import { cn } from '@/ui/utils/cn';
import ThemeIcon from '../ThemeMode/ThemeIcon';

interface CheckboxProps {
  checked: boolean;
  defaultChecked?: boolean;
  onChange?(checked: boolean): void;
  background?: string;
  unCheckBackground?: string;
  width?: string;
  height?: string;
  className?: string;
  checkBoxClassName?: string;
  labelClassName?: string;
  children?: ReactNode;
  checkIcon?: ReactNode;
  type?: 'circle' | 'square';
  disabled?: boolean;
}

const Checkbox = ({
  checked,
  onChange,
  defaultChecked = false,
  background = 'var(--r-blue-default, #7084ff)',
  unCheckBackground = 'var(--r-neutral-line, #D3D8E0)',
  type = 'circle',
  width = '16px',
  height = '16px',
  checkBoxClassName,
  labelClassName,
  className,
  children,
  checkIcon,
  disabled = false,
}: CheckboxProps) => {
  const [checkState, setCheckState] = useState(defaultChecked);

  useEffect(() => {
    setCheckState(checked);
  }, [checked]);

  const handleValueChange = (e: SyntheticEvent, checked) => {
    if (disabled) return;
    e.stopPropagation();
    onChange && onChange(checked);
  };

  return (
    <div
      className={cn(
        'rabby-checkbox__wrapper inline-flex items-center select-none',
        className,
        { checked: checkState }
      )}
      onClick={(e) => handleValueChange(e, !checkState)}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className={cn(
          'rabby-checkbox relative flex items-center justify-center',
          'transition-[background-color] duration-300 ease-[ease]',
          type,
          type === 'circle' && 'rounded-[100%]',
          checkBoxClassName
        )}
        style={{
          width,
          height,
          backgroundColor: checkState ? background : unCheckBackground,
        }}
      >
        {checkIcon ??
          (checkState && (
            <ThemeIcon src={IconCheck} className="icon icon-check w-[54%]" />
          ))}
      </div>
      {children && (
        <div className={cn('rabby-checkbox__label ml-8', labelClassName)}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Checkbox;
