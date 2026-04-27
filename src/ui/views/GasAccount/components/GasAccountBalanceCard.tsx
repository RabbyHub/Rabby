import React from 'react';
import { useTranslation } from 'react-i18next';

import { formatUsdValue } from '@/ui/utils';

import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';

export const GasAccountBalanceCard: React.FC<{
  balance?: number | string | null;
}> = ({ balance }) => {
  const { t } = useTranslation();
  const gasBalanceLabel = t('page.gasAccount.gasBalance', {
    defaultValue: 'Gas Balance',
  });

  return (
    <GasAccountWrapperBg className="mb-16 h-[124px] rounded-[12px] bg-r-neutral-card1 px-18 py-18">
      <div className="relative z-10 flex h-full items-center justify-between gap-16">
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="text-r-neutral-title-1 text-[40px] leading-[44px] font-bold">
            {formatUsdValue(balance || 0)}
          </div>
          <div className="mt-8 text-14 leading-[20px]">
            <span className="text-r-neutral-foot">{gasBalanceLabel}</span>
          </div>
        </div>
        <GasAccountBlueLogo className="h-[92px] w-[66px] shrink-0" />
      </div>
    </GasAccountWrapperBg>
  );
};
