import React from 'react';
import { Input, InputProps, InputRef } from 'antd';
import { cn } from '@/ui/utils/cn';
import styles from './AccountItem.module.css';

export const AccountItemWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(styles.accountItemWrapper, className)}
    {...rest}
  />
));

export const AccountItemInputWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(styles.accountItemInputWrapper, className)}
    {...rest}
  />
));

export const AccountItemInput = React.forwardRef<InputRef, InputProps>(
  ({ className, ...rest }, ref) => (
    <Input
      ref={ref}
      className={cn(styles.accountItemInput, className)}
      {...rest}
    />
  )
);

export const AccountItemAddress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    ref={ref}
    className={cn(styles.accountItemAddress, className)}
    {...rest}
  />
));
