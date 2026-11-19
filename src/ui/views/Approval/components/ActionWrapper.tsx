import clsx from 'clsx';
import React from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './ActionWrapper.module.css';

export const DIV = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div ref={ref} className={cn(styles.wrapper, className)} {...rest} />
));

export const ActionWrapper: React.FC<{
  isEmptyBody?: boolean;
  children?: React.ReactNode;
}> = ({ children, isEmptyBody }) => {
  return (
    <DIV>
      <div className={clsx('space-y-12')}>{children}</div>
    </DIV>
  );
};
