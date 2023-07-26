import { useCallback, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';

import { useSafeState } from '../safeState';

import { useTokens } from './token';
import { usePortfolios } from './usePortfolio';

const Cache_Timeout = 5 * 60;

export const useQueryProjects = (
  userAddr: string | undefined,
  withHistory = false,
  visible: boolean,
  isTestnet = false
) => {
  const [time, setTime] = useSafeState(dayjs().subtract(1, 'day'));

  useEffect(() => {
    if (time!.add(1, 'day').add(Cache_Timeout, 's').isBefore(dayjs())) {
      // refreshPositions();
    }
  }, [time]);

  const historyTime = useMemo(() => (withHistory ? time : undefined), [
    withHistory,
    time,
  ]);

  const {
    tokens,
    netWorth: tokenNetWorth,
    isLoading: isTokensLoading,
    hasValue: hasTokens,
    updateData: updateTokens,
    walletProject,
    customizeTokens,
    blockedTokens,
  } = useTokens(userAddr, historyTime, visible, 0, undefined, isTestnet);

  const {
    data: portfolios,
    isLoading: isPortfoliosLoading,
    hasValue: hasPortfolios,
    netWorth: portfolioNetWorth,
    updateData: updatePortfolio,
  } = usePortfolios(userAddr, historyTime, visible, isTestnet);

  const refreshPositions = useCallback(() => {
    if (!isTokensLoading && !isPortfoliosLoading) {
      updatePortfolio();
      updateTokens();
      setTime(dayjs().subtract(1, 'day'));
    }
  }, [
    updatePortfolio,
    updateTokens,
    isTokensLoading,
    isPortfoliosLoading,
    setTime,
  ]);

  const grossNetWorth = useMemo(() => tokenNetWorth + portfolioNetWorth!, [
    tokenNetWorth,
    portfolioNetWorth,
  ]);

  return {
    tokenNetWorth,
    portfolioNetWorth,
    grossNetWorth,
    refreshPositions,
    isTokensLoading,
    isPortfoliosLoading,
    hasTokens,
    hasPortfolios,
    tokens,
    customizeTokens,
    blockedTokens,
    portfolios,
    walletProject,
  };
};
