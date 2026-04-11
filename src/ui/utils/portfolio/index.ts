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
  isTestnet = false,
  lpTokenMode = false,
  showBlocked = false,
  searchMode = false,
  autoLoad = true
) => {
  const [time, setTime] = useSafeState(dayjs().subtract(1, 'day'));
  const shouldAutoLoad = visible && autoLoad;

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
    isAllTokenLoading,
    hasValue: hasTokens,
    updateData: updateTokens,
    walletProject,
    customizeTokens,
    blockedTokens,
  } = useTokens(
    userAddr,
    historyTime,
    shouldAutoLoad,
    0,
    undefined,
    isTestnet,
    lpTokenMode,
    showBlocked,
    searchMode,
    true // disableRecommended
  );

  const {
    data: portfolios,
    isLoading: isPortfoliosLoading,
    hasValue: hasPortfolios,
    netWorth: portfolioNetWorth,
    updateData: updatePortfolio,
    removeProtocol,
  } = usePortfolios(userAddr, historyTime, shouldAutoLoad, isTestnet);

  const refreshPositions = useCallback(() => {
    if (!autoLoad || (!isTokensLoading && !isPortfoliosLoading)) {
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
    autoLoad,
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
    refreshTokens: updateTokens,
    refreshPortfolios: updatePortfolio,
    isTokensLoading,
    isAllTokenLoading,
    isPortfoliosLoading,
    hasTokens,
    hasPortfolios,
    tokens,
    customizeTokens,
    blockedTokens,
    portfolios,
    walletProject,
    removeProtocol,
  };
};
