import { useAppChain } from '@/ui/hooks/useAppChain';
import useSortTokens from '@/ui/hooks/useSortTokens';
import { useRabbySelector } from '@/ui/store';
import { useCommonPopupView } from '@/ui/utils';
import { useQueryProjects } from '@/ui/utils/portfolio';
import { useEffect, useMemo, useState } from 'react';

export const useTokenAndDIFIData = ({
  selectChainId,
}: {
  selectChainId?: string;
}) => {
  const [lpTokenMode, setLpTokenMode] = useState(false);

  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));

  const { setApps } = useCommonPopupView();

  const {
    isTokensLoading,
    isAllTokenLoading,
    isPortfoliosLoading,
    portfolios,
    tokens: tokenList,
    hasTokens,
    removeProtocol,
    portfolioNetWorth,
    refreshPositions,
  } = useQueryProjects(
    currentAccount?.address,
    false,
    true,
    false,
    lpTokenMode,
    true
  );

  const {
    data: appPortfolios,
    netWorth: appPortfolioNetWorth,
    isLoading: isAppPortfoliosLoading,
  } = useAppChain(currentAccount?.address, true, false);

  const currentPortfolioNetWorth = useMemo(() => {
    return (portfolioNetWorth || 0) + (appPortfolioNetWorth || 0);
  }, [portfolioNetWorth, appPortfolioNetWorth]);

  const displayTokenList = useMemo(() => {
    if (selectChainId) {
      return tokenList.filter((item) => item.chain === selectChainId);
    }
    return tokenList;
  }, [tokenList, selectChainId]);

  const displayPortfolios = useMemo(() => {
    const combinedPortfolios = [
      ...(portfolios || []),
      ...(appPortfolios || []),
    ].sort((m, n) => (n.netWorth || 0) - (m.netWorth || 0));
    if (selectChainId) {
      return combinedPortfolios?.filter((item) => item.chain === selectChainId);
    }
    return combinedPortfolios;
  }, [portfolios, appPortfolios, selectChainId]);

  const sortTokens = useSortTokens(displayTokenList);

  useEffect(() => {
    if (appPortfolios) {
      setApps(
        appPortfolios.map((item) => ({
          logo: item.logo || '',
          name: item.name,
          id: item.id,
          usd_value: item.netWorth || 0,
        }))
      );
    }
  }, [appPortfolios]);

  const appIds = useMemo(() => {
    return [...new Set(appPortfolios?.map((item) => item.id) || [])];
  }, [appPortfolios]);

  const isNoResults =
    !isTokensLoading &&
    !isPortfoliosLoading &&
    !isAppPortfoliosLoading &&
    !sortTokens.length &&
    !displayPortfolios?.length;

  return {
    // useQueryProjects
    isTokensLoading,
    isAllTokenLoading,
    isPortfoliosLoading,
    portfolios,
    tokenList,
    hasTokens,
    removeProtocol,
    portfolioNetWorth,
    // useQueryProjects end
    // useAppChain
    appPortfolios,
    appPortfolioNetWorth,
    isAppPortfoliosLoading,
    // useAppChain end
    currentPortfolioNetWorth,
    displayTokenList,
    displayPortfolios,
    sortTokens,
    lpTokenMode,
    setLpTokenMode,
    appIds,
    isNoResults,
    refreshPositions,
  };
};
