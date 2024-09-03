import React, { useMemo } from 'react';
import { ReactComponent as IconRcGasAccount } from '@/ui/assets/gas-account/gas-account-cc.svg';
import clsx from 'clsx';
import { useGasAccountInfo } from '../hooks';
import { formatTokenAmount } from '@/ui/utils';

const formatUsdValue = (usd: string | number) => {
  const v = Number(usd);
  if (v >= 1000) {
    return `$${formatTokenAmount(Number(v).toFixed(0), 0)}`;
  }
  if (v >= 100) {
    return `$${Number(v).toFixed(1)}`;
  }
  return `$${Number(v).toFixed(2)}`;
};

export const GasAccountDashBoardHeader = () => {
  const { value, loading } = useGasAccountInfo();

  const usd = useMemo(() => {
    if (loading) {
      return formatUsdValue(0);
    }
    if (value && 'account' in value) {
      return formatUsdValue(value.account.balance);
    }
  }, [value]);

  return (
    <div
      className={clsx(
        'flex gap-2 items-center justify-center',
        'px-8 py-6 rounded-[4px]',
        'text-13 leading-normal text-light-r-neutral-title-2',
        'text-opacity-60 hover:text-opacity-100',
        'bg-light-r-neutral-title-2 bg-opacity-10 hover:bg-opacity-20'
      )}
    >
      <IconRcGasAccount viewBox="0 0 16 16" className="w-16 h-16" />
      <>{usd}</>
    </div>
  );
};
