import React, { ReactNode, useEffect, useState } from 'react';
import IconCheck from 'ui/assets/check.svg';
import './style.less';

interface CheckboxProps {
  checked: boolean;
  defaultChecked?: boolean;
  onChange?(checked: boolean): void;
  background?: string;
  width?: string;
  height?: string;
  children?: ReactNode;
}

const unCheckBackground = '#D8DFEB';

const Checkbox = ({
  checked,
  onChange,
  defaultChecked = false,
  background = '#8697FF',
  width = '16px',
  height = '16px',
  children,
}: CheckboxProps) => {
  const [checkState, setCheckState] = useState(defaultChecked);

  useEffect(() => {
    setCheckState(checked);
  }, [checked]);

  const handleValueChange = (checked) => {
    onChange && onChange(checked);
  };

  return (
    <div
      className="rabby-checkbox__wrapper"
      onClick={() => handleValueChange(!checkState)}
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
