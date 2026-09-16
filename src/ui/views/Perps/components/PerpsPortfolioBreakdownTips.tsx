import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import { computePortfolioBreakdownValues } from '../utils/accountPricing';
import type { PerpsBreakdownMode } from '../utils/accountPricing';

const COPY: Record<
  PerpsBreakdownMode,
  { title: string; desc: string; secondary: string }
> = {
  manual: {
    title: 'page.perps.PerpsCard.manualAccount',
    desc: 'page.perps.PerpsCard.manualAccountDesc',
    secondary: 'page.perps.PerpsCard.breakdownSpot',
  },
  unified: {
    title: 'page.perps.PerpsCard.unifiedAccount',
    desc: 'page.perps.PerpsCard.unifiedAccountDesc',
    secondary: 'page.perps.PerpsCard.breakdownOtherAssets',
  },
  portfolioMargin: {
    title: 'page.perps.PerpsCard.portfolioMarginAccount',
    desc: 'page.perps.PerpsCard.portfolioMarginAccountDesc',
    secondary: 'page.perps.PerpsCard.breakdownNetOtherAssets',
  },
};

export const PerpsPortfolioBreakdownTips: React.FC<{
  mode: PerpsBreakdownMode;
  portfolioValue: number;
}> = ({ mode, portfolioValue }) => {
  const { t } = useTranslation();

  // Only mounted while the popover is open, so tracking the pricing slices
  // here (rather than in the card) keeps the card off the price-tick path.
  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  const balances = useRabbySelector((s) => s.perps.spotState.balances);
  const spotAssetCtxs = useRabbySelector((s) => s.perps.spotAssetCtxs);
  const spotMeta = useRabbySelector((s) => s.perps.spotMeta);
  const stakingSummary = useRabbySelector((s) => s.perps.stakingSummary);

  const { perpsValue, secondaryValue, stakingValue } = useMemo(
    () =>
      computePortfolioBreakdownValues(mode, portfolioValue, {
        clearinghouseState,
        spotState: { balances },
        spotAssetCtxs,
        spotMeta,
        stakingSummary,
      }),
    [
      mode,
      portfolioValue,
      clearinghouseState,
      balances,
      spotAssetCtxs,
      spotMeta,
      stakingSummary,
    ]
  );

  const copy = COPY[mode];
  const rows = [
    { label: t('page.perps.PerpsCard.breakdownPerps'), value: perpsValue },
    { label: t(copy.secondary), value: secondaryValue },
  ];
  if (stakingValue != null) {
    rows.push({
      label: t('page.perps.PerpsCard.breakdownStaking'),
      value: stakingValue,
    });
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-col gap-[4px]">
        <div className="text-[14px] font-medium text-r-neutral-title-1">
          {t(copy.title)}
        </div>
        <div className="text-[11px] font-normal text-r-neutral-foot w-[244px]">
          {t(copy.desc)}
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
