import clsx from 'clsx';
import React from 'react';

export interface UnknownTagProps {
  className?: string;
}

const UnknownTag = ({ className }: UnknownTagProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center whitespace-nowrap',
        'rounded-[4px] px-[4px] py-[2px]',
        'bg-rb-neutral-bg-0 text-rb-neutral-secondary',
        'text-[11px] leading-[11px] font-normal',
        className
      )}
    >
      Unknown
    </span>
  );
};

export default UnknownTag;
