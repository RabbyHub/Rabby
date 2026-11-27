import React from 'react';
import { Button } from 'antd';
import { cn } from '@/ui/utils/cn';
import styles from './BlueBorderedButton.module.css';

export const PerpsBlueBorderedButton = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof Button>
>(({ className, ...rest }, ref) => (
  <Button
    ref={ref}
    className={cn(styles.perpsBlueBorderedButton, className)}
    {...rest}
  />
));

// antd's Tooltip reads this static to wrap a disabled Button in a span.
// styled(Button) used to copy it over; keep it on the wrapper.
Object.assign(PerpsBlueBorderedButton, { __ANT_BUTTON: true });
