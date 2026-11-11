import clsx from 'clsx';
import React from 'react';
import type { TooltipV6Placement } from '@/ui/component/Tooltip/TooltipV6';
import { PerpsTooltip } from '../PerpsTooltip';

export const DashedUnderlineText = React.forwardRef<
  HTMLSpanElement,
  {
    children: React.ReactNode;
    needCursor?: boolean;
    tooltipText?: string | (() => React.ReactNode);
    /** Which side of the text the tooltip opens on (default `top`). */
    tooltipPlacement?: TooltipV6Placement;
    className?: string;
  } & React.HTMLAttributes<HTMLSpanElement>
>(
  (
    {
      children,
      className,
      needCursor = true,
      tooltipText,
      tooltipPlacement = 'top',
      ...rest
    },
    ref
  ) => {
    return tooltipText ? (
      <PerpsTooltip
        placement={tooltipPlacement}
        trigger="hover"
        title={typeof tooltipText === 'function' ? tooltipText() : tooltipText}
      >
        <span
          ref={ref}
          className={clsx(
            'relative inline-block',
            needCursor && 'cursor-pointer',
            className
          )}
          {...rest}
        >
          {children}
          <span
            className="absolute left-0 right-0 bottom-0"
            style={{
              borderBottom: '1px dashed currentColor',
            }}
          />
        </span>
      </PerpsTooltip>
    ) : (
      <span
        ref={ref}
        className={clsx(
          'relative inline-block',
          needCursor && 'cursor-pointer',
          className
        )}
        {...rest}
      >
        {children}
        <span
          className="absolute left-0 right-0 bottom-0"
          style={{
            borderBottom: '1px dashed currentColor',
          }}
        />
      </span>
    );
  }
);
