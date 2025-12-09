import { useAppChain } from '@/ui/hooks/useAppChain';
import useSortTokens from '@/ui/hooks/useSortTokens';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useCommonPopupView } from '@/ui/utils';
import { useQueryProjects } from '@/ui/utils/portfolio';
import { useEffect, useMemo } from 'react';

export const useTokenAndDIFIData = ({
  selectChainId,
}: {
  selectChainId?: string;
}) => {
  const dispatch = useRabbyDispatch();

  const { currentAccount, allMode } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
    allMode: s.preference.desktopTokensAllMode ?? false,
  }));

  const { setApps } = useCommonPopupView();
  useEffect(() => {
    dispatch.preference.getPreference('desktopTokensAllMode');
  }, [dispatch]);

  const {
    isTokensLoading,
    isPortfoliosLoading,
    portfolios,
    tokens: tokenList,
    hasTokens,
    removeProtocol,
    portfolioNetWorth,
  } = useQueryProjects(
    currentAccount?.address,
    false,
    true,
    false,
    allMode,
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
    const result = tokenList.filter((item) => item.is_verified); // only show verified tokens
    if (selectChainId) {
      return result.filter((item) => item.chain === selectChainId);
    }
    return result;
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
    allMode,
    appIds,
    isNoResults,
  };
};
