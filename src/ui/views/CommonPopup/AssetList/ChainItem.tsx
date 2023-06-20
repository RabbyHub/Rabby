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
        'cursor-pointer relative hover:opacity-60',
        {
          'opacity-30': inactive,
        },
        className
      )}
    >
      <TooltipWithMagnetArrow className="rectangle" title={name}>
        <img className="w-16 h-16" src={logo_url} alt={name} />
      </TooltipWithMagnetArrow>
      <span className="text-13 font-bold text-gray-title">
        ${currentBalance}
      </span>
      <span className="text-12 text-black">{percent?.toFixed(0)}%</span>
    </div>
  );
};
