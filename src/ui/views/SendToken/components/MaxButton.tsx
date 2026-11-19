import React from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './MaxButton.module.css';

export const SendMaxButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div ref={ref} className={cn(styles.sendMaxButton, className)} {...rest} />
));

export const MaxButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div ref={ref} className={cn(styles.maxButton, className)} {...rest} />
));
