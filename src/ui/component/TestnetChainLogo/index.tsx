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
        'w-[28px] h-[28px] rounded-full bg-[#6A7587]',
        'text-[12px] leading-[14px] text-r-neutral-title2',
        'flex items-center justify-center',
        className
      )}
    >
      {name.substring(0, 3)}
    </div>
  );
};
