/** @deprecated */
import React, { useEffect, useMemo } from 'react';
import { useRabbySelector, useRabbyDispatch } from '@/ui/store';
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
import { useSwitchNetTab } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { AbstractProject } from '@/ui/utils/portfolio/types';
import { useTranslation } from 'react-i18next';

interface Props {
  className?: string;
  selectChainId?: string;
  onProjectOverviewListChange?: (projects: AbstractProject[]) => void;
}

export const TokensTabPane: React.FC<Props> = ({
  className,
  selectChainId,
  onProjectOverviewListChange,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const { currentAccount, allMode } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
    allMode: s.preference.desktopTokensAllMode ?? false,
  }));
  const { setApps } = useCommonPopupView();

  useEffect(() => {
    dispatch.preference.getPreference('desktopTokensAllMode');
  }, [dispatch]);

  const setAllMode = (value: boolean) => {
    dispatch.preference.setDesktopTokensAllMode(value);
  };

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

  const {
    isExpanded,
    result: currentList,
    toggleExpand,
    hasExpandSwitch,
    smallLength,
  } = useExpandList(displayPortfolios, currentPortfolioNetWorth);
  const { selectedTab, onTabChange } = useSwitchNetTab();

  const tokenListTotalValue = React.useMemo(() => {
    return sortTokens
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [sortTokens]);

  const projectOverviewList = React.useMemo(() => {
    return [
      getTokenWalletFakeProject(
        tokenListTotalValue,
        t('page.desktopProfile.portfolio.headers.wallet')
      ),
      ...(currentList || []),
    ];
  }, [tokenListTotalValue, currentList]);

  const isNoResults =
    !isTokensLoading &&
    !isPortfoliosLoading &&
    !isAppPortfoliosLoading &&
    !sortTokens.length &&
    !displayPortfolios?.length;

  useEffect(() => {
    if (allMode || isNoResults || projectOverviewList?.length <= 1) {
      onProjectOverviewListChange?.([]);
      return;
    }
    if (projectOverviewList) {
      onProjectOverviewListChange?.(projectOverviewList);
    }
  }, [projectOverviewList.length, allMode, isNoResults]);

  if (isTokensLoading && !hasTokens) {
    return (
      <div className="mx-20">
        <TokenListViewSkeleton />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 只有wallet的话也不显示 */}
      {!allMode && !isNoResults && projectOverviewList?.length > 1 && (
        <ProjectOverview
          list={projectOverviewList}
          appIds={appIds}
          isExpanded={isExpanded}
          smallLength={smallLength}
          toggleExpand={toggleExpand}
          hasExpandSwitch={hasExpandSwitch}
        />
      )}

      {/*{isTokensLoading ? (
        <div className="mx-20">
          <TokenListSkeleton />
        </div>
      ) : (
        <TokenList
          list={sortTokens}
          isNoResults={isNoResults}
          totalValue={tokenListTotalValue}
          selectedTab={selectedTab}
          onTabChange={onTabChange}
        />
      )}*/}

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
