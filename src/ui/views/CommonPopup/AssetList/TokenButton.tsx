import clsx from 'clsx';
import React from 'react';
import { ReactComponent as LowValueArrowSVG } from '@/ui/assets/dashboard/low-value-arrow.svg';

export interface Props {
  label: string;
  count: number;
  onClick?: () => void;
}

export const TokenButton: React.FC<Props> = ({ label, count, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-[2px] py-6 px-8',
        'text-12 bg-gray-bg text-black',
        'flex items-center',
        'gap-2',
        'hover:opacity-60'
      )}
    >
      <span>{count}</span>
      <span>{label}</span>
      <LowValueArrowSVG className="w-14 h-14" />
    </button>
  );
};
