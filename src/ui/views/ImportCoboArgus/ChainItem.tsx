// import { RcIconChecked, RcIconNotChecked } from '@/ui/assets';
import { Chain } from '@debank/common';
import { Checkbox } from 'ui/component';
import clsx from 'clsx';
import React from 'react';

interface Props {
  chain: Chain;
  checked: boolean;
  onChecked?: () => void;
}

export const ChainItem: React.FC<Props> = ({ chain, checked, onChecked }) => {
  return (
    <div
      className={clsx(
        'flex justify-between bg-r-neutral-card-1 items-center',
        'py-12 px-16',
        'rounded-[6px]',
        'cursor-pointer',
        'hover:border-blue-light border',
        {
          'border-blue-light': checked,
          'border-transparent': !checked,
        }
      )}
      onClick={onChecked}
    >
      <div className="flex gap-[12px] items-center">
        <img src={chain.logo} className="w-28" />
        <span className="font-medium text-15 text-r-neutral-title-1">
          {chain.name}
        </span>
      </div>
      <div>
        <Checkbox width="20px" height="20px" checked={checked} />
      </div>
    </div>
  );
};
