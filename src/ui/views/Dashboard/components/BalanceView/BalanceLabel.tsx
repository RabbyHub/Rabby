import { CurrencyItem } from '@/background/service/openapi';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatCurrencyParts } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';

interface Props {
  // isCache: boolean;
  balanceUsd: number;
  currency: CurrencyItem;
}
export const BalanceLabel: React.FC<Props> = ({ balanceUsd, currency }) => {
  const formattedBalance = formatCurrencyParts(balanceUsd || 0, { currency });
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
      ) : formattedBalance.isPrefix ? (
        <div
          className={clsx(
            'font-bold text-[28px] leading-[33px] truncate max-w-full'
          )}
        >
          {formattedBalance.text}
        </div>
      ) : (
        <div
          className={clsx(
            'inline-flex items-end gap-[4px] max-w-full overflow-hidden',
            'font-bold text-[28px] leading-[33px]'
          )}
        >
          <span className="min-w-0 truncate">
            {formattedBalance.sign}
            {formattedBalance.isLessThan ? '<' : ''}
            {formattedBalance.amount}
          </span>
          <span
            className={clsx(
              'shrink-0 pb-[4px] text-[16px] leading-[19px] font-medium'
            )}
          >
            {formattedBalance.symbol}
          </span>
        </div>
      )}
    </div>
  );
};
