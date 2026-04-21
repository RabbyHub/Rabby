import { useRabbySelector } from '@/ui/store';
import { UserAbstractionResp } from '@rabby-wallet/hyperliquid-sdk';
import { useMemo } from 'react';

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

  return {
    accountValue,
    availableBalance,
    isUnifiedAccount,
    // When not unified, spot balances are not meaningful for Perps margin usage.
    spotBalances: isUnifiedAccount ? spotBalances : EMPTY_BALANCES,
    spotBalancesMap: isUnifiedAccount ? spotBalancesMap : EMPTY_BALANCES_MAP,
  };
};
