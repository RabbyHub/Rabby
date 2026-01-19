import clsx from 'clsx';
import React from 'react';

export const DashedUnderlineText = React.forwardRef<
  HTMLSpanElement,
  {
    children: React.ReactNode;
    needCursor?: boolean;
    className?: string;
  } & React.HTMLAttributes<HTMLSpanElement>
>(({ children, className, needCursor = true, ...rest }, ref) => {
  return (
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
