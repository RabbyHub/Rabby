import React, { ReactNode } from 'react';
import './style.less';

interface FieldProps {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon: ReactNode;
  onClick?(): void;
}

const Field = ({ children, leftIcon, rightIcon, onClick }: FieldProps) => {
  return (
    <div
      className="field"
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
