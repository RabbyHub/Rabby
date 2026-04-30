import { useRabbySelector } from '@/ui/store';
import {
  USDC_TOKEN_ID,
  UserAbstractionResp,
} from '@rabby-wallet/hyperliquid-sdk';
import { useCallback, useMemo } from 'react';
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

export const usePerpsAccount = () => {
  const userAbstraction = useRabbySelector(
    (store) => store.perps.userAbstraction
  );
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
  // borrowed positions. unifiedAccount doesn't need this override; its
  // collateral is already accurately captured by stablecoin totals.
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
    return Number(
      isUnifiedAccount
        ? spotAvailableToTrade
        : clearinghouseState?.withdrawable || 0
    );
  }, [
    isPortfolioMargin,
    portfolioMarginAccountValue,
    isUnifiedAccount,
    spotAvailableToTrade,
    clearinghouseState?.withdrawable,
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
    spotBalancesMap: isSpotCollateralMode ? spotBalancesMap : EMPTY_BALANCES_MAP,
  };
};
