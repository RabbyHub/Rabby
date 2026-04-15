import { useCallback, useMemo } from 'react';

import { useTokens } from './token';
import { usePortfolios } from './usePortfolio';

export const useQueryProjects = (
  userAddr: string | undefined,
  visible: boolean,
  lpTokenMode = false,
  showBlocked = false,
  searchMode = false,
  autoLoad = true
) => {
  const shouldAutoLoad = visible && autoLoad;

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
  } = useTokens(userAddr, {
    visible: shouldAutoLoad,
    lpTokensOnly: lpTokenMode,
    showBlocked,
    searchMode,
    disableRecommended: true,
  });

  const {
    data: portfolios,
    isLoading: isPortfoliosLoading,
    hasValue: hasPortfolios,
    netWorth: portfolioNetWorth,
    updateData: updatePortfolio,
    removeProtocol,
  } = usePortfolios(userAddr, shouldAutoLoad);

  const refreshPositions = useCallback(() => {
    if (!autoLoad || (!isTokensLoading && !isPortfoliosLoading)) {
      updatePortfolio();
      updateTokens();
    }
  }, [
    updatePortfolio,
    updateTokens,
    isTokensLoading,
    isPortfoliosLoading,
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
