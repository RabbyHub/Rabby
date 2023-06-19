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
}

export const ChainItem: React.FC<Props> = ({
  item: { logo_url, symbol, usd_value, percent },
  className,
  onClick,
}) => {
  const currentBalance = splitNumberByStep(usd_value.toFixed(2));

  return (
    <div
      onClick={onClick}
      className={clsx('flex gap-6 items-center', 'cursor-pointer', className)}
    >
      <img className="w-16 h-16" src={logo_url} alt={symbol} />
      <span className="text-13 font-bold text-gray-title">
        ${currentBalance}
      </span>
      <span className="text-12 text-black">{percent?.toFixed(0)}%</span>
    </div>
  );
};
