import { CurrencyItem } from '@/background/service/openapi';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatCurrency } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';

interface Props {
  // isCache: boolean;
  balanceUsd: number;
  currency: CurrencyItem;
}
export const BalanceLabel: React.FC<Props> = ({ balanceUsd, currency }) => {
  const formattedBalance = formatCurrency(balanceUsd || 0, { currency });
  const { hiddenBalance } = useRabbySelector((state) => state.preference);
  const dispatch = useRabbyDispatch();

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch.preference.setHiddenBalance(!hiddenBalance);
  };

  return (
    <div
      className={clsx(
        'cursor-pointer transition-opacity truncate'
        // isCache && 'opacity-80'
      )}
      onClick={handleClick}
    >
      {hiddenBalance ? (
        <div
          className={clsx(
            'font-bold text-[30px] leading-[36px] tracking-[16px]',
            'mr-[-16px] ml-4'
          )}
        >
          *****
        </div>
      ) : (
        <div>{formattedBalance}</div>
      )}
    </div>
  );
};
