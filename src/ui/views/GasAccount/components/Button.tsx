import React from 'react';
import { Button } from 'antd';
import { cn } from '@/ui/utils/cn';
import styles from './Button.module.css';

export const GasAccountRedBorderedButton = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof Button>
>(({ className, ...rest }, ref) => (
  <Button
    ref={ref}
    className={cn(styles.gasAccountRedBorderedButton, className)}
    {...rest}
  />
));

export const GasAccountBlueBorderedButton = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof Button>
>(({ className, ...rest }, ref) => (
  <Button
    ref={ref}
    className={cn(styles.gasAccountBlueBorderedButton, className)}
    {...rest}
  />
));

// antd's Tooltip reads this static to wrap a disabled Button in a span.
// styled(Button) used to copy it over; keep it on the wrappers.
Object.assign(GasAccountRedBorderedButton, { __ANT_BUTTON: true });
Object.assign(GasAccountBlueBorderedButton, { __ANT_BUTTON: true });
