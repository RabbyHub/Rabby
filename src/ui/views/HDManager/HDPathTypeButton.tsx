import { LedgerHDPathType, LedgerHDPathTypeLabel } from '@/ui/utils/ledger';
import clsx from 'clsx';
import React from 'react';
import './index.less';

export import HDPathType = LedgerHDPathType;
export const HDPathTypeLabel = LedgerHDPathTypeLabel;

interface Props {
  type: HDPathType;
  isOnChain: boolean;
  onClick?: (type: HDPathType) => void;
  selected?: boolean;
}
export const HDPathTypeButton: React.FC<Props> = ({
  type,
  isOnChain,
  onClick,
  selected,
}) => {
  return (
    <button
      className={clsx('HDPathTypeButton', {
        'HDPathTypeButton--on-chain': isOnChain,
        'HDPathTypeButton--selected': selected,
      })}
      onClick={() => onClick?.(type)}
    >
      {HDPathTypeLabel[type]}
    </button>
  );
};
