import clsx from 'clsx';
import React from 'react';
import { ReactComponent as RcIconArrowUpCC } from './icons/arrow-up-cc.svg';

export const ChainToggleButton = ({
  label,
  expanded,
  onClick,
  className,
}: {
  label: string;
  expanded?: boolean;
  onClick(): void;
  className?: string;
}) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-[4px] cursor-pointer',
        'text-12 font-medium text-r-neutral-body leading-none',
        'hover:text-r-blue-default',
        className
      )}
      onClick={onClick}
    >
      <span className="whitespace-nowrap">{label}</span>
      <RcIconArrowUpCC
        className={clsx('w-14 h-14 shrink-0', {
          'rotate-180': !expanded,
        })}
      />
    </div>
  );
};
