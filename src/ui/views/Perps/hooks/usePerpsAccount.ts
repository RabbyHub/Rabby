import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import {
  USDC_TOKEN_ID,
  UserAbstractionResp,
} from '@rabby-wallet/hyperliquid-sdk';
import { useCallback, useEffect, useMemo } from 'react';
import { getDexQuoteAsset } from '@/ui/models/perps';
import { getSpotBalanceKey, PerpsQuoteAsset } from '../constants';

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
    availableToTrade: spotAvailableToTrade,
    balances: spotBalances,
    balancesMap: spotBalancesMap,
    tokenToAvailableAfterMaintenance,
  } = useRabbySelector((store) => store.perps.spotState);

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

  const perpsWithdrawable = clearinghouseState?.withdrawable;

  // Portfolio margin needs the server-computed net free margin in USDC —
  // simple stablecoin sums miss LTV-weighted collateral (HYPE/UBTC/...) and
  // borrowed positions.
  const portfolioMarginAccountValue = useMemo(() => {
    if (!isPortfolioMargin) {
      return 0;
    }
    const entry = tokenToAvailableAfterMaintenance?.find(
      ([tokenId]) => tokenId === USDC_TOKEN_ID
    );
    return entry ? Number(entry[1]) || 0 : 0;
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

  const availableBalance = useMemo<number>(() => {
    if (isPortfolioMargin) {
      return portfolioMarginAccountValue;
    }
    if (isUnifiedAccount) {
      // spot free cash + free cross margin (held on the spot ledger, so
      // spot availableToTrade alone misses it)
      return (
        (Number(spotAvailableToTrade) || 0) +
        (Number(clearinghouseState?.crossAvailableAllDexs) || 0)
      );
    }
    return Number(clearinghouseState?.withdrawable) || 0;
  }, [
    isPortfolioMargin,
    portfolioMarginAccountValue,
    isUnifiedAccount,
    spotAvailableToTrade,
    clearinghouseState?.crossAvailableAllDexs,
    clearinghouseState?.withdrawable,
  ]);

  // Per-coin display availability: each dex's free cross margin belongs to
  // the dex's quote stablecoin. Only the home-card chips consume this —
  // withdraw/swap keep reading spotBalancesMap (actual spot free, since held
  // funds can't be withdrawn or swapped).
  const displaySpotBalancesMap = useMemo(() => {
    const byDex = clearinghouseState?.crossAvailableByDex;
    if (!isUnifiedAccount || !byDex) {
      return spotBalancesMap;
    }
    const next = { ...spotBalancesMap };
    for (const [dexId, free] of Object.entries(byDex)) {
      const extra = Number(free) || 0;
      const coin = getSpotBalanceKey(getDexQuoteAsset(dexId));
      const cur = next[coin];
      if (!extra || !cur) continue;
      next[coin] = {
        ...cur,
        available: String((Number(cur.available) || 0) + extra),
      };
    }
    return next;
  }, [
    isUnifiedAccount,
    spotBalancesMap,
    clearinghouseState?.crossAvailableByDex,
  ]);

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
      return coin === 'USDC' ? Number(perpsWithdrawable) || 0 : 0;
    },
    [
      isPortfolioMargin,
      portfolioMarginAccountValue,
      isSpotCollateralMode,
      getSpotBalance,
      perpsWithdrawable,
    ]
  );

  return {
    accountValue,
    availableBalance,
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
    displaySpotBalancesMap: isSpotCollateralMode
      ? displaySpotBalancesMap
      : EMPTY_BALANCES_MAP,
  };
};
