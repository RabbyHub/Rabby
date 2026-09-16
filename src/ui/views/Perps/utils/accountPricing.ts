import BigNumber from 'bignumber.js';
import type { SpotMeta } from '@rabby-wallet/hyperliquid-sdk';
import {
  UserAbstractionResp,
  USDC_TOKEN_ID,
} from '@rabby-wallet/hyperliquid-sdk';
import type { SpotBalance } from '@/ui/views/DesktopPerps/utils';
import {
  computeSpotPortfolioValue,
  usdcMarkPx,
  SpotAssetCtxs,
} from '@/ui/views/DesktopPerps/components/AccountInfo/utils';
import { getSpotBalanceKey } from '../constants';

/** Staking is HYPE-only; this is its token name in spotMeta. */
export const STAKING_TOKEN_NAME = 'HYPE';

export type StakingSummaryAmounts = {
  delegated: string;
  undelegated: string;
  totalPendingWithdrawal: string;
};

/**
 * HYPE held by the staking account — a ledger separate from spot, so none of
 * it shows in spot balances. The official portfolio series counts all three
 * buckets (delegated, undelegated, the 7-day unstaking queue) at the HYPE
 * spot mark.
 */
export const getStakedHypeAmount = (
  summary: StakingSummaryAmounts | null | undefined
): string => {
  if (!summary) return '0';
  return new BigNumber(summary.delegated || 0)
    .plus(summary.undelegated || 0)
    .plus(summary.totalPendingWithdrawal || 0)
    .toString();
};

export const computeStakingValue = (
  stakingHype: unknown,
  spotAssetCtxs: SpotAssetCtxs,
  spotMeta: SpotMeta | null | undefined
): number => {
  const amount = new BigNumber((stakingHype as string) || 0);
  if (!amount.isFinite() || amount.lte(0)) return 0;
  const price = usdcMarkPx(STAKING_TOKEN_NAME, spotAssetCtxs, spotMeta);
  if (!price) return 0;
  return amount.times(price).toNumber();
};

/**
 * Portfolio Value on the official site's Total Equity basis.
 *
 * unified / portfolioMargin hold collateral on the spot side, so the perps
 * `marginSummary.accountValue` there only mirrors money the spot total
 * already counts — adding it would double-count. manual holds it separately,
 * so it is added. Staking sits outside spotState and is counted in EVERY
 * mode.
 */
export const computePerpsPortfolioValue = ({
  balances,
  includePerpsAccountValue,
  perpsAccountValue,
  spotAssetCtxs,
  spotMeta,
  stakingHype,
}: {
  balances: SpotBalance[];
  includePerpsAccountValue: boolean;
  perpsAccountValue: unknown;
  spotAssetCtxs: SpotAssetCtxs;
  spotMeta: SpotMeta | null | undefined;
  stakingHype?: unknown;
}): number => {
  let value = new BigNumber(
    computeSpotPortfolioValue(balances, spotAssetCtxs, spotMeta)
  ).plus(computeStakingValue(stakingHype, spotAssetCtxs, spotMeta));
  if (includePerpsAccountValue) {
    value = value.plus(new BigNumber((perpsAccountValue as string) || 0));
  }
  return value.toNumber();
};

/**
 * Live Portfolio Value from a perps state snapshot, or null when the slices
 * it needs have not landed yet.
 *
 * Kept as a plain function (no hooks) so the gating logic is unit-testable and
 * so the caller can run it inside a single store selector — returning the
 * rounded number lets the store's Object.is check suppress re-renders on the
 * unthrottled market-wide price feed.
 */
export const computeLivePortfolioValue = (perps: {
  userAbstraction?: unknown;
  spotMeta?: SpotMeta | null;
  isSpotStateReady?: boolean;
  isUserDataReady?: boolean;
  stakingStatus?: string;
  stakingSummary?: StakingSummaryAmounts | null;
  spotState?: { balances?: SpotBalance[] };
  spotAssetCtxs?: SpotAssetCtxs;
  clearinghouseState?: { marginSummary?: { accountValue?: string } } | null;
}): number | null => {
  const isSpotCollateral =
    perps.userAbstraction === UserAbstractionResp.unifiedAccount ||
    perps.userAbstraction === UserAbstractionResp.portfolioMargin;

  // Without spotMeta the pricing index cannot resolve non-USDC assets (not
  // even USDT0/USDH) and the value would silently miss most of the spot side.
  // The staking snapshot is REST-only; before it lands the value would be
  // short by the whole staking side. In both cases return null so the caller
  // falls back to the portfolio API's last point, which already counts it.
  if (
    !perps.spotMeta ||
    !perps.isSpotStateReady ||
    (!isSpotCollateral && !perps.isUserDataReady) ||
    perps.stakingStatus !== 'success'
  ) {
    return null;
  }

  const total = computePerpsPortfolioValue({
    balances: perps.spotState?.balances || [],
    includePerpsAccountValue: !isSpotCollateral,
    perpsAccountValue: perps.clearinghouseState?.marginSummary?.accountValue,
    spotAssetCtxs: perps.spotAssetCtxs || {},
    spotMeta: perps.spotMeta,
    stakingHype: getStakedHypeAmount(perps.stakingSummary),
  });
  // Cent-round so price ticks only move the value when the display changes.
  return Math.round(total * 100) / 100;
};

/**
 * Portfolio margin's server-computed net free margin for USDC, pulled out of
 * `tokenToAvailableAfterMaintenance`. Shared by `computeAvailableBalance` and
 * `usePerpsAccount`'s `portfolioMarginAccountValue` so the lookup lives in a
 * single place instead of being duplicated.
 */
export const getPortfolioMarginUsdcAvailable = (
  list: [number, string][] | null | undefined
): number => {
  const entry = list?.find(([tokenId]) => tokenId === USDC_TOKEN_ID);
  return entry ? Number(entry[1]) || 0 : 0;
};

/**
 * Available balance from a perps state snapshot, on the basis Task 6 set:
 *
 * - portfolioMargin: the server-computed net free margin for USDC
 *   (`tokenToAvailableAfterMaintenance`), already USDC-only;
 * - unified: spot USDC available + the raw perps-side withdrawable;
 * - manual: the raw perps-side withdrawable.
 *
 * "Raw" perps withdrawable is `perpsWithdrawable` when the unified overwrite
 * has run (it preserves the pre-overwrite value there) and `withdrawable`
 * otherwise — in EVERY mode, so a unified→manual switch does not read the
 * merged value for the frame before the next perps update lands.
 *
 * Plain function so the formula has a unit-test line of defence; the hook
 * just wraps it in useMemo.
 */
export const computeAvailableBalance = (perps: {
  userAbstraction?: unknown;
  spotState?: {
    balancesMap?: Record<string, { available?: string }>;
    tokenToAvailableAfterMaintenance?: [number, string][] | null;
  };
  clearinghouseState?: {
    withdrawable?: string;
    perpsWithdrawable?: string;
  } | null;
}): number => {
  const isPortfolioMargin =
    perps.userAbstraction === UserAbstractionResp.portfolioMargin;
  if (isPortfolioMargin) {
    // Server-computed net free margin; already USDC-only.
    return getPortfolioMarginUsdcAvailable(
      perps.spotState?.tokenToAvailableAfterMaintenance
    );
  }

  // Raw perps-side withdrawable: `perpsWithdrawable` when the unified
  // overwrite has run (it preserves the pre-overwrite value there),
  // `withdrawable` otherwise — the frame arrived before userAbstraction was
  // known, so `withdrawable` is still the raw value.
  const rawPerpsWithdrawable =
    perps.clearinghouseState?.perpsWithdrawable ??
    perps.clearinghouseState?.withdrawable;

  const isUnifiedAccount =
    perps.userAbstraction === UserAbstractionResp.unifiedAccount;
  if (isUnifiedAccount) {
    const usdc =
      Number(
        perps.spotState?.balancesMap?.[getSpotBalanceKey('USDC')]?.available
      ) || 0;
    const perpsAmount = Number(rawPerpsWithdrawable) || 0;
    return usdc + perpsAmount;
  }

  return Number(rawPerpsWithdrawable) || 0;
};

export type PerpsBreakdownMode = 'manual' | 'unified' | 'portfolioMargin';

export type PerpsPortfolioBreakdownValues = {
  perpsValue: number;
  secondaryValue: number;
  /** Manual mode only, null when the staking account is empty. */
  stakingValue: number | null;
};

/**
 * Amounts for the "Portfolio Value" breakdown popover (mirrors mobile's
 * computePortfolioBreakdownValues).
 *
 * Perps row (all modes): `marginSummary.accountValue` — perps-side net equity
 * including all unrealized pnl. Second row: manual "Spot" = USD value of all
 * spot assets; unified / portfolio margin ("Other Assets" / "Net Other
 * Assets") = Portfolio Value − Perps, so the rows always sum to the headline.
 * Third row (manual only): "Staking" when non-zero, so Perps + Spot + Staking
 * still sums to the PV. The spot-collateral modes fold it into the remainder.
 */
export const computePortfolioBreakdownValues = (
  mode: PerpsBreakdownMode,
  portfolioValue: number,
  perps: {
    clearinghouseState?: { marginSummary?: { accountValue?: string } } | null;
    spotState?: { balances?: SpotBalance[] };
    spotAssetCtxs?: SpotAssetCtxs;
    spotMeta?: SpotMeta | null;
    stakingSummary?: StakingSummaryAmounts | null;
  }
): PerpsPortfolioBreakdownValues => {
  const perpsValue =
    Number(perps.clearinghouseState?.marginSummary?.accountValue) || 0;

  if (mode === 'manual') {
    const ctxs = perps.spotAssetCtxs || {};
    const stakingValue = computeStakingValue(
      getStakedHypeAmount(perps.stakingSummary),
      ctxs,
      perps.spotMeta
    );
    return {
      perpsValue,
      secondaryValue:
        Number(
          computeSpotPortfolioValue(
            perps.spotState?.balances || [],
            ctxs,
            perps.spotMeta
          )
        ) || 0,
      stakingValue: stakingValue > 0 ? stakingValue : null,
    };
  }

  return {
    perpsValue,
    secondaryValue: portfolioValue - perpsValue,
    stakingValue: null,
  };
};
