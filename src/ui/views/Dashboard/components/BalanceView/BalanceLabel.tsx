import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';

interface Props {
  // isCache: boolean;
  balance: number;
}
export const BalanceLabel: React.FC<Props> = ({ balance }) => {
  const splitBalance = splitNumberByStep((balance || 0).toFixed(2));
  const { hiddenBalance } = useRabbySelector((state) => state.preference);
  const dispatch = useRabbyDispatch();

  const handleClick = () => {
    dispatch.preference.setHiddenBalance(!hiddenBalance);
  };

  return (
    <div
      className={clsx(
        'cursor-pointer transition-opacity'
        // isCache && 'opacity-80'
      )}
      title={splitBalance}
      onClick={handleClick}
    >
      {hiddenBalance ? (
        <span
          className={clsx(
            'font-bold text-[32px] tracking-[16px]',
            'mr-[-16px] ml-4'
          )}
        >
          *****
        </span>
      ) : (
        <span>${splitBalance}</span>
      )}
    </div>
  );
};
