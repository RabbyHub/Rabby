import React from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';

export const PerpsPortfolioBreakdownTips: React.FC<{
  portfolioValue: number;
  perpsValue: number;
}> = ({ portfolioValue, perpsValue }) => {
  const { t } = useTranslation();
  // Derive the second row so the two rows always add up to the headline
  // value; computing spot independently would leave the staking share out.
  const otherAssets = portfolioValue - perpsValue;

  const rows = [
    { label: t('page.perps.PerpsCard.breakdownPerps'), value: perpsValue },
    {
      label: t('page.perps.PerpsCard.breakdownOtherAssets'),
      value: otherAssets,
    },
  ];

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-col gap-[4px]">
        <div className="text-[14px] font-medium text-r-neutral-title-1">
          {t('page.perps.PerpsCard.unifiedAccount')}
        </div>
        <div className="text-[11px] font-normal text-r-neutral-foot w-[244px]">
          {t('page.perps.PerpsCard.unifiedAccountDesc')}
        </div>
      </div>
      <div className="bg-r-neutral-card2 rounded-[4px] px-[16px] py-[4px] w-full">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-[6px] text-[13px] font-medium whitespace-nowrap"
          >
            <span className="text-r-neutral-foot">{row.label}</span>
            <span className="text-r-neutral-title-1">
              {formatUsdValue(row.value, BigNumber.ROUND_DOWN)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
