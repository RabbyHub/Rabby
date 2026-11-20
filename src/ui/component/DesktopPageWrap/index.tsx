import React from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

export const DesktopPageWrap = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div ref={ref} className={cn(styles.desktopPageWrap, className)} {...rest} />
));
