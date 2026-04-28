import { useRabbySelector } from '@/ui/store';
import { UserAbstractionResp } from '@rabby-wallet/hyperliquid-sdk';
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
  } = useRabbySelector((store) => store.perps.spotState);

  const isUnifiedAccount = useMemo(() => {
    return userAbstraction === UserAbstractionResp.unifiedAccount;
  }, [userAbstraction]);

  const perpsWithdrawable = clearinghouseState?.withdrawable;

  const accountValue = useMemo(() => {
    return isUnifiedAccount
      ? Number(spotAccountValue) || 0
      : Number(clearinghouseState?.marginSummary?.accountValue) || 0;
  }, [
    isUnifiedAccount,
    spotAccountValue,
    clearinghouseState?.marginSummary?.accountValue,
  ]);

  const availableBalance = useMemo(() => {
    return Number(
      isUnifiedAccount
        ? spotAvailableToTrade
        : clearinghouseState?.withdrawable || 0
    );
  }, [
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
      if (isUnifiedAccount) {
        return getSpotBalance(coin);
      }
      return Number(perpsWithdrawable) || 0;
    },
    [isUnifiedAccount, getSpotBalance, perpsWithdrawable]
  );

  return {
    accountValue,
    availableBalance,
    isUnifiedAccount,
    getSpotBalance,
    getAvailableByAsset,
    // When not unified, spot balances are not meaningful for Perps margin usage.
    spotBalances: isUnifiedAccount ? spotBalances : EMPTY_BALANCES,
    spotBalancesMap: isUnifiedAccount ? spotBalancesMap : EMPTY_BALANCES_MAP,
  };
};
