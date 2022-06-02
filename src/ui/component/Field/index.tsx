import React, { ReactNode } from 'react';
import cx from 'clsx';
import './style.less';

interface FieldProps {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon: ReactNode;
  onClick?(): void;
  className?: string;
}

const Field = ({
  children,
  leftIcon,
  rightIcon,
  onClick,
  className,
}: FieldProps) => {
  return (
    <div
      className={cx('field', className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'initial' }}
    >
      {leftIcon && <div className="left-icon">{leftIcon}</div>}
      <div className="field-slot">{children}</div>
      <div className="right-icon">{rightIcon}</div>
    </div>
  );
};

export default Field;
