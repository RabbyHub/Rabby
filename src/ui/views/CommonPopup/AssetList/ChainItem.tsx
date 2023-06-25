import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { DisplayChainWithWhiteLogo } from '@/ui/hooks/useCurrentBalance';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';

export interface ChainItemType extends DisplayChainWithWhiteLogo {
  percent: number;
}

export interface Props {
  item: ChainItemType;
  className?: string;
  onClick?(): void;
  inactive?: boolean;
}

export const ChainItem: React.FC<Props> = ({
  item: { logo_url, name, usd_value, percent },
  className,
  onClick,
  inactive,
}) => {
  const currentBalance = splitNumberByStep(usd_value.toFixed(2));

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex gap-6 items-center',
        'cursor-pointer relative',
        className
      )}
    >
      <TooltipWithMagnetArrow className="rectangle" title={name}>
        <img
          className={clsx('w-16 h-16', {
            'opacity-30': inactive,
          })}
          src={logo_url}
          alt={name}
        />
      </TooltipWithMagnetArrow>
      <span
        className={clsx('text-13 font-bold text-gray-title', {
          'opacity-30': inactive,
        })}
      >
        ${currentBalance}
      </span>
      <span
        className={clsx('text-12 text-black', {
          'opacity-30': inactive,
        })}
      >
        {percent?.toFixed(0)}%
      </span>
    </div>
  );
};
