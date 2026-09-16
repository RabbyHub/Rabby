import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { UserAbstractionResp } from '@rabby-wallet/hyperliquid-sdk';
import { useCallback, useEffect, useMemo } from 'react';
import { getSpotBalanceKey, PerpsQuoteAsset } from '../constants';
import {
  computeAvailableBalance,
  getPortfolioMarginUsdcAvailable,
} from '../utils/accountPricing';

type SpotBalance = {
  coin: string;
  token: number;
  total: string;
  hold: string;
  available: string;
};

const EMPTY_BALANCES_MAP = {} as Record<string, SpotBalance>;
const EMPTY_BALANCES: SpotBalance[] = [];

// userAbstraction is only fetched by the login flow; if that never ran the
// store still holds the initial 'default'. Fetch once on first hook load —
// module-level so concurrent consumers don't each fire a request.
let didBootstrapUserAbstraction = false;

export const usePerpsAccount = () => {
  const dispatch = useRabbyDispatch();
  const currentPerpsAddress = useRabbySelector(
    (store) => store.perps.currentPerpsAccount?.address
  );
  const userAbstraction = useRabbySelector(
    (store) => store.perps.userAbstraction
  );

  useEffect(() => {
    if (didBootstrapUserAbstraction || !currentPerpsAddress) return;
    didBootstrapUserAbstraction = true;
    dispatch.perps.fetchUserAbstraction(currentPerpsAddress);
  }, [currentPerpsAddress, dispatch]);
  const clearinghouseState = useRabbySelector(
    (store) => store.perps.clearinghouseState
  );

  const {
    accountValue: spotAccountValue,
    balances: spotBalances,
    balancesMap: spotBalancesMap,
    tokenToAvailableAfterMaintenance,
  } = useRabbySelector((store) => store.perps.spotState);

  const isSpotStateReady = useRabbySelector((s) => s.perps.isSpotStateReady);
  const isUserDataReady = useRabbySelector((s) => s.perps.isUserDataReady);

  const isUnifiedAccount = useMemo(() => {
    return userAbstraction === UserAbstractionResp.unifiedAccount;
  }, [userAbstraction]);

  const isPortfolioMargin = useMemo(() => {
    return userAbstraction === UserAbstractionResp.portfolioMargin;
  }, [userAbstraction]);

  // unifiedAccount and portfolioMargin both keep collateral on the spot side
  // (perps clearinghouse `marginSummary.accountValue` reads as "0" for them).
  // Route both modes through the spot-derived account value.
  const isSpotCollateralMode = useMemo(() => {
    return isUnifiedAccount || isPortfolioMargin;
  }, [isUnifiedAccount, isPortfolioMargin]);

  // Raw perps-side withdrawable in every mode: `perpsWithdrawable` when the
  // unified overwrite has run (it preserves the pre-overwrite value there),
  // `withdrawable` otherwise. See computeAvailableBalance.
  const rawPerpsWithdrawable =
    clearinghouseState?.perpsWithdrawable ?? clearinghouseState?.withdrawable;

  // Portfolio margin needs the server-computed net free margin in USDC —
  // simple stablecoin sums miss LTV-weighted collateral (HYPE/UBTC/...) and
  // borrowed positions. unifiedAccount doesn't need this override; its
  // collateral is already accurately captured by stablecoin totals.
  const portfolioMarginAccountValue = useMemo(() => {
    if (!isPortfolioMargin) {
      return 0;
    }
    return getPortfolioMarginUsdcAvailable(tokenToAvailableAfterMaintenance);
  }, [isPortfolioMargin, tokenToAvailableAfterMaintenance]);

  const accountValue = useMemo<number>(() => {
    if (isPortfolioMargin) {
      return portfolioMarginAccountValue;
    }
    return isUnifiedAccount
      ? Number(spotAccountValue) || 0
      : Number(clearinghouseState?.marginSummary?.accountValue) || 0;
  }, [
    isPortfolioMargin,
    portfolioMarginAccountValue,
    isUnifiedAccount,
    spotAccountValue,
    clearinghouseState?.marginSummary?.accountValue,
  ]);

  // Formula lives in computeAvailableBalance (plain function, unit-tested);
  // this just wraps it in a memo keyed on the individual slices it reads
  // (not a whole-object `spotState` selector — see feedback_avoid_large_selector_for_trivial_lookup).
  const availableBalance = useMemo<number>(
    () =>
      computeAvailableBalance({
        userAbstraction,
        spotState: {
          balancesMap: spotBalancesMap,
          tokenToAvailableAfterMaintenance,
        },
        clearinghouseState,
      }),
    [
      userAbstraction,
      spotBalancesMap,
      tokenToAvailableAfterMaintenance,
      clearinghouseState,
    ]
  );

  // Which slices Available depends on differs by mode: spot-collateral modes
  // read the spot side, manual reads only the perps side. Showing a value
  // before the needed slice lands would flash a too-small balance.
  const isAvailableBalanceReady = useMemo<boolean>(() => {
    if (isPortfolioMargin) return isSpotStateReady;
    if (isUnifiedAccount) return isSpotStateReady && isUserDataReady;
    return isUserDataReady;
  }, [isPortfolioMargin, isUnifiedAccount, isSpotStateReady, isUserDataReady]);

  const getSpotBalance = useCallback(
    (coin: PerpsQuoteAsset) => {
      const balance = spotBalancesMap[getSpotBalanceKey(coin)];
      return balance ? Number(balance.available) || 0 : 0;
    },
    [spotBalancesMap]
  );

  const getAvailableByAsset = useCallback(
    (coin: PerpsQuoteAsset) => {
      if (isPortfolioMargin && coin === 'USDC') {
        return portfolioMarginAccountValue;
      }
      if (isSpotCollateralMode) {
        return getSpotBalance(coin);
      }
      return coin === 'USDC' ? Number(rawPerpsWithdrawable) || 0 : 0;
    },
    [
      isPortfolioMargin,
      portfolioMarginAccountValue,
      isSpotCollateralMode,
      getSpotBalance,
      rawPerpsWithdrawable,
    ]
  );

  return {
    accountValue,
    availableBalance,
    isAvailableBalanceReady,
    isUnifiedAccount,
    isPortfolioMargin,
    getSpotBalance,
    getAvailableByAsset,
    // When not in spot-collateral mode (default/disabled/dexAbstraction),
    // spot balances are not meaningful for Perps margin usage.
    spotBalances: isSpotCollateralMode ? spotBalances : EMPTY_BALANCES,
    spotBalancesMap: isSpotCollateralMode
      ? spotBalancesMap
      : EMPTY_BALANCES_MAP,
  };
};
