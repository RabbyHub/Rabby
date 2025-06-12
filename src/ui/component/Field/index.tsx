import React, { ReactNode } from 'react';
import cx from 'clsx';
import './style.less';

interface FieldProps {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon: ReactNode;
  onClick?(): void;
  className?: string;
  style?: React.CSSProperties;
}

const Field = ({
  children,
  leftIcon,
  rightIcon,
  onClick,
  className,
  style,
}: FieldProps) => {
  return (
    <div
      className={cx('field', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'initial', ...style }}
    >
      {leftIcon && <div className="left-icon">{leftIcon}</div>}
      <div className="field-slot">{children}</div>
      <div className="right-icon">{rightIcon}</div>
    </div>
  );
};

export default Field;
