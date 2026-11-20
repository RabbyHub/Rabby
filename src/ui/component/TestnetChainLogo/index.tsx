import clsx from 'clsx';
import React from 'react';

export const TestnetChainLogo = ({
  className,
  name,
}: {
  className?: string;
  name: string;
}) => {
  return (
    <div
      className={clsx(
        'w-[28px] h-[28px] rounded-full bg-light-r-neutral-foot',
        'text-[12px] leading-[14px] text-r-neutral-title2',
        'flex items-center justify-center',
        className
      )}
    >
      {name.trim().substring(0, 1).toUpperCase()}
    </div>
  );
};
