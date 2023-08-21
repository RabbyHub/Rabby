import { IconChecked, IconNotChecked } from '@/ui/assets';
import { Chain } from '@debank/common';
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
        'flex justify-between bg-white items-center',
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
        <img src={chain.logo} />
        <span className="font-medium text-15">{chain.name}</span>
      </div>
      <div>
        <img
          className="w-20 h-20"
          src={checked ? IconChecked : IconNotChecked}
          alt="checkbox"
        />
      </div>
    </div>
  );
};
