import React, { ReactNode } from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

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
      className={cn(
        styles.field,
        'field flex justify-between items-center',
        'px-12 py-0 min-h-[56px] bg-white rounded-[6px]',
        className
      )}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'initial', ...style }}
    >
      {leftIcon && (
        <div className="left-icon mr-[13px] shrink-0 flex items-center">
          {leftIcon}
        </div>
      )}
      <div className="field-slot flex items-center flex-1 overflow-hidden">
        {children}
      </div>
      <div className="right-icon shrink-0 flex items-center">{rightIcon}</div>
    </div>
  );
};

export default Field;
