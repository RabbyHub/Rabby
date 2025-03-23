import React, { ReactNode, SyntheticEvent, useEffect, useState } from 'react';
import cx from 'clsx';
import IconCheck from 'ui/assets/check.svg';
import './style.less';
import clsx from 'clsx';
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
  children?: ReactNode;
  checkIcon?: ReactNode;
  type?: 'circle' | 'square';
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
  className,
  children,
  checkIcon,
}: CheckboxProps) => {
  const [checkState, setCheckState] = useState(defaultChecked);

  useEffect(() => {
    setCheckState(checked);
  }, [checked]);

  const handleValueChange = (e: SyntheticEvent, checked) => {
    e.stopPropagation();
    onChange && onChange(checked);
  };

  return (
    <div
      className={cx('rabby-checkbox__wrapper', className, {
        checked: checkState,
      })}
      onClick={(e) => handleValueChange(e, !checkState)}
    >
      <div
        className={clsx('rabby-checkbox', type, checkBoxClassName)}
        style={{
          width,
          height,
          backgroundColor: checkState ? background : unCheckBackground,
        }}
      >
        {checkIcon ?? <ThemeIcon src={IconCheck} className="icon icon-check" />}
      </div>
      {children && <div className="rabby-checkbox__label">{children}</div>}
    </div>
  );
};

export default Checkbox;
