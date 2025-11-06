import React, { useEffect, useMemo, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import useSortTokens from 'ui/hooks/useSortTokens';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import ProtocolList from './ProtocolList';
import { useQueryProjects } from 'ui/utils/portfolio';
import { useAppChain } from '@/ui/hooks/useAppChain';
import { useCommonPopupView } from '@/ui/utils';
import { TokenList } from './TokenList';
import { useExpandList } from './useExpandList';
import ProjectOverview from './ProjectOverview';
import BigNumber from 'bignumber.js';
import { getTokenWalletFakeProject } from './utils';

interface Props {
  className?: string;
  selectChainId?: string;
}

export const TokensTabPane: React.FC<Props> = ({
  className,
  selectChainId,
}) => {
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const { setApps } = useCommonPopupView();
  const [allMode, setAllMode] = useState(false);

  const {
    isTokensLoading,
    isPortfoliosLoading,
    portfolios,
    tokens: tokenList,
    hasTokens,
    removeProtocol,
    portfolioNetWorth,
  } = useQueryProjects(currentAccount?.address, false, true, false, allMode);

  const {
    data: appPortfolios,
    netWorth: appPortfolioNetWorth,
    isLoading: isAppPortfoliosLoading,
  } = useAppChain(currentAccount?.address, true, false);

  const currentPortfolioNetWorth = useMemo(() => {
    return (portfolioNetWorth || 0) + (appPortfolioNetWorth || 0);
  }, [portfolioNetWorth, appPortfolioNetWorth]);

  const displayTokenList = useMemo(() => {
    const result = tokenList;
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

  const {
    isExpanded,
    result: currentList,
    toggleExpand,
    hasExpandSwitch,
    smallLength,
  } = useExpandList(displayPortfolios, currentPortfolioNetWorth);

  const tokenListTotalValue = React.useMemo(() => {
    return sortTokens
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [sortTokens]);

  const projectOverviewList = React.useMemo(() => {
    return [
      getTokenWalletFakeProject(tokenListTotalValue),
      ...(currentList || []),
    ];
  }, [tokenListTotalValue, currentList]);

  if (isTokensLoading && !hasTokens) {
    return (
      <div className="mx-20">
        <TokenListViewSkeleton />;
      </div>
    );
  }

  const isNoResults =
    !isTokensLoading &&
    !isPortfoliosLoading &&
    !isAppPortfoliosLoading &&
    !sortTokens.length &&
    !displayPortfolios?.length;

  return (
    <div className={className}>
      {!allMode && !isNoResults && (
        <ProjectOverview
          list={projectOverviewList}
          appIds={appIds}
          isExpanded={isExpanded}
          smallLength={smallLength}
          toggleExpand={toggleExpand}
          hasExpandSwitch={hasExpandSwitch}
        />
      )}

      {isTokensLoading ? (
        <div className="mx-20">
          <TokenListSkeleton />
        </div>
      ) : (
        <TokenList
          allMode={allMode}
          onAllModeChange={setAllMode}
          list={sortTokens}
          isNoResults={isNoResults}
          totalValue={tokenListTotalValue}
        />
      )}

      {!allMode && (
        <div>
          {isPortfoliosLoading && isAppPortfoliosLoading ? (
            <TokenListSkeleton />
          ) : (
            <ProtocolList
              removeProtocol={removeProtocol}
              appIds={appIds}
              list={currentList}
              isExpanded={isExpanded}
              toggleExpand={toggleExpand}
              hasExpandSwitch={hasExpandSwitch}
            />
          )}
        </div>
      )}
    </div>
  );
};
