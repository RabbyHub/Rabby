import clsx from 'clsx';
import React from 'react';

export interface Props {
  color: 'orange' | 'gray' | 'green';
  size?: 'small' | 'normal';
  isBadge?: boolean;
  className?: string;
}

export const Signal: React.FC<Props> = ({
  color,
  size = 'normal',
  isBadge,
  className,
}) => {
  return (
    <div
      className={clsx(
        'rounded-full',
        'border border-white',
        {
          'bg-r-orange-default': color === 'orange',
          'bg-r-neutral-foot': color === 'gray',
          'bg-r-green-default': color === 'green',
          'w-[6px] h-[6px]': size === 'small',
          'w-[8px] h-[8px]': size === 'normal',
          'right-[-2px] bottom-[-2px] absolute': isBadge,
        },
        className
      )}
    />
  );
};
