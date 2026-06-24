import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import { formatPerpsPct } from '@/ui/views/Perps/utils';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import {
  computeCrossMarginRatio,
  computeUnifiedAccountRatio,
  computePortfolioMarginRatio,
  computeBorrowCapUsed,
  computeSpotPortfolioValue,
  computeTotalCollateralBalance,
  computeLtvAdjustedPortfolioValue,
} from './utils';

export type AccountSummaryKind = 'perps' | 'unified' | 'portfolioMargin';

export interface SummaryRow {
  key: string;
  label: string;
  tooltip?: string;
  valueText: string;
  /** When set, render the 3-zone RatioGaugeIcon + colored value for this row. */
  gaugeRatio?: number;
}

export interface EquityCol {
  key: string;
  label: string;
  tooltip?: string;
  valueText: string;
  /** When set, render as a signed PNL (green/red) instead of valueText. */
  pnl?: number;
}

export interface AccountSummary {
  kind: AccountSummaryKind;
  title: string;
  summaryRows: SummaryRow[];
  equityCols: EquityCol[];
}

const usd = (v: number) => formatUsdValue(v, BigNumber.ROUND_DOWN);

/**
 * Normalizes the perps account into the rows the AccountInfo panel renders, by
 * account type. Every value uses the Phase-3 pure fns, which mirror the
 * Hyperliquid frontend's exact field→display formulas (no invented rules).
 */
export const usePerpsAccountSummary = (): AccountSummary => {
  const { t } = useTranslation();

  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  const spotState = useRabbySelector((s) => s.perps.spotState);
  const spotAssetCtxs = useRabbySelector((s) => s.perps.spotAssetCtxs);
  const spotMeta = useRabbySelector((s) => s.perps.spotMeta);
  const marketDataMap = useRabbySelector((s) => s.perps.marketDataMap);

  const { accountValue, isUnifiedAccount, isPortfolioMargin } = usePerpsAccount();

  return useMemo<AccountSummary>(() => {
    const tk = (k: string) => t(`page.perpsPro.accountInfo.${k}`);

    const positionAllPnl =
      clearinghouseState?.assetPositions
        ?.reduce(
          (acc, ap) => acc.plus(new BigNumber(ap.position.unrealizedPnl || 0)),
          new BigNumber(0)
        )
        ?.toNumber() ?? 0;

    const maintenanceMargin = Number(
      clearinghouseState?.crossMaintenanceMarginUsed || 0
    );

    const mmRow: SummaryRow = {
      key: 'mm',
      label: tk('maintenanceMargin'),
      tooltip: tk('maintenanceMarginTips'),
      valueText: usd(maintenanceMargin),
    };
    const pnlCol: EquityCol = {
      key: 'pnl',
      label: tk('unrealizedPnl'),
      valueText: '',
      pnl: positionAllPnl,
    };

    if (isPortfolioMargin) {
      const ratio = computePortfolioMarginRatio(spotState);
      const ltvAdjusted = computeLtvAdjustedPortfolioValue(
        spotState.balances,
        spotAssetCtxs,
        spotMeta
      );
      const borrowCapUsed = computeBorrowCapUsed(spotState);
      const portfolioValue = computeSpotPortfolioValue(
        spotState.balances,
        spotAssetCtxs,
        spotMeta
      );
      return {
        kind: 'portfolioMargin',
        title: tk('portfolioMarginSummary'),
        summaryRows: [
          {
            key: 'ratio',
            label: tk('portfolioMarginRatio'),
            tooltip: tk('portfolioMarginRatioTips'),
            valueText: formatPerpsPct(ratio),
            gaugeRatio: ratio,
          },
          mmRow,
          {
            key: 'ltv',
            label: tk('ltvAdjustedPortfolioValue'),
            tooltip: tk('ltvAdjustedPortfolioValueTips'),
            valueText: usd(ltvAdjusted),
          },
          {
            key: 'borrow',
            label: tk('borrowCapUsed'),
            tooltip: tk('borrowCapUsedTips'),
            valueText: formatPerpsPct(borrowCapUsed),
          },
        ],
        equityCols: [
          { key: 'pv', label: tk('portfolioValue'), valueText: usd(portfolioValue) },
          pnlCol,
        ],
      };
    }

    if (isUnifiedAccount) {
      const ratio = computeUnifiedAccountRatio({
        clearinghouseState,
        marketDataMap,
        spotBalancesMap: spotState.balancesMap,
      });
      const totalCollateral = computeTotalCollateralBalance(
        spotState.balances,
        spotAssetCtxs,
        spotMeta
      );
      const portfolioValue = computeSpotPortfolioValue(
        spotState.balances,
        spotAssetCtxs,
        spotMeta
      );
      return {
        kind: 'unified',
        title: tk('unifiedAccountSummary'),
        summaryRows: [
          {
            key: 'ratio',
            label: tk('unifiedAccountRatio'),
            tooltip: tk('unifiedAccountRatioTips'),
            valueText: formatPerpsPct(ratio),
            gaugeRatio: ratio,
          },
          mmRow,
          {
            key: 'tc',
            label: tk('totalCollateralBalance'),
            tooltip: tk('totalCollateralBalanceTips'),
            valueText: usd(totalCollateral),
          },
        ],
        equityCols: [
          { key: 'pv', label: tk('portfolioValue'), valueText: usd(portfolioValue) },
          pnlCol,
        ],
      };
    }

    // Default cross account ("Perps Account Summary").
    const ratio = computeCrossMarginRatio(clearinghouseState);
    const marginBalance = Number(
      clearinghouseState?.crossMarginSummary?.accountValue || 0
    );
    const balance = Number(accountValue || 0) - positionAllPnl;
    return {
      kind: 'perps',
      title: tk('perpsAccountSummary'),
      summaryRows: [
        {
          key: 'ratio',
          label: tk('crossMarginRatio'),
          tooltip: tk('crossMarginRatioTips'),
          valueText: formatPerpsPct(ratio),
          gaugeRatio: ratio,
        },
        mmRow,
        {
          key: 'mb',
          label: tk('marginBalance'),
          tooltip: tk('marginBalanceTips'),
          valueText: usd(marginBalance),
        },
      ],
      equityCols: [
        {
          key: 'bal',
          label: tk('balance'),
          tooltip: tk('balanceTip'),
          valueText: usd(balance),
        },
        pnlCol,
      ],
    };
  }, [
    t,
    clearinghouseState,
    spotState,
    spotAssetCtxs,
    spotMeta,
    marketDataMap,
    accountValue,
    isUnifiedAccount,
    isPortfolioMargin,
  ]);
};
