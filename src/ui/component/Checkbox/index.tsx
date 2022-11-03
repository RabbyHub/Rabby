import React, { ReactNode, SyntheticEvent, useEffect, useState } from 'react';
import cx from 'clsx';
import IconCheck from 'ui/assets/check.svg';
import './style.less';

interface CheckboxProps {
  checked: boolean;
  defaultChecked?: boolean;
  onChange?(checked: boolean): void;
  background?: string;
  width?: string;
  height?: string;
  className?: string;
  children?: ReactNode;
}

const unCheckBackground = '#B4BDCC';

const Checkbox = ({
  checked,
  onChange,
  defaultChecked = false,
  background = '#8697FF',
  width = '16px',
  height = '16px',
  className,
  children,
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
      className={cx('rabby-checkbox__wrapper', className)}
      onClick={(e) => handleValueChange(e, !checkState)}
    >
      <div
        className="rabby-checkbox"
        style={{
          width,
          height,
          backgroundColor: checkState ? background : unCheckBackground,
        }}
      >
        <img src={IconCheck} className="icon icon-check" />
      </div>
      {children && <div className="rabby-checkbox__label">{children}</div>}
    </div>
  );
};

export default Checkbox;
