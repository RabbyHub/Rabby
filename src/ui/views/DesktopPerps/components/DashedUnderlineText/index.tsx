import { Tooltip } from 'antd';
import clsx from 'clsx';
import React from 'react';

export const DashedUnderlineText = React.forwardRef<
  HTMLSpanElement,
  {
    children: React.ReactNode;
    needCursor?: boolean;
    tooltipText?: string;
    className?: string;
  } & React.HTMLAttributes<HTMLSpanElement>
>(({ children, className, needCursor = true, tooltipText, ...rest }, ref) => {
  return tooltipText ? (
    <Tooltip
      overlayClassName="rectangle"
      placement="top"
      trigger="hover"
      title={tooltipText}
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
    </Tooltip>
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
});
