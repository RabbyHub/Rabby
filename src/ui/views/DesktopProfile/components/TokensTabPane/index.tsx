import React, { useEffect, useMemo } from 'react';
import { AddTokenEntryInst } from '@/ui/views/CommonPopup/AssetList/AddTokenEntry';
import { useRabbySelector } from '@/ui/store';
import { HomeTokenList } from '@/ui/views/CommonPopup/AssetList/TokenList';
import useSortTokens from 'ui/hooks/useSortTokens';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import ProtocolList from '@/ui/views/CommonPopup/AssetList/ProtocolList';
import { useQueryProjects } from 'ui/utils/portfolio';
import { Input } from 'antd';
import { useFilterProtocolList } from '@/ui/views/CommonPopup/AssetList/useFilterProtocolList';
import { useAppChain } from '@/ui/hooks/useAppChain';
import { useCommonPopupView } from '@/ui/utils';
import { TokenList } from './TokenList';

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

  const {
    isTokensLoading,
    isPortfoliosLoading,
    portfolios,
    tokens: tokenList,
    hasTokens,
    blockedTokens,
    customizeTokens,
    removeProtocol,
  } = useQueryProjects(currentAccount?.address, false, true, false);

  const {
    data: appPortfolios,
    isLoading: isAppPortfoliosLoading,
  } = useAppChain(currentAccount?.address, true, false);

  const inputRef = React.useRef<Input>(null);
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

  const displayBlockedTokens = useMemo(() => {
    if (selectChainId) {
      return blockedTokens?.filter((item) => item.chain === selectChainId);
    }
    return blockedTokens;
  }, [blockedTokens, selectChainId]);

  const displayCustomizeTokens = useMemo(() => {
    if (selectChainId) {
      return customizeTokens?.filter((item) => item.chain === selectChainId);
    }
    return customizeTokens;
  }, [customizeTokens, selectChainId]);

  const sortTokens = useSortTokens(displayTokenList);
  const filteredPortfolios = useFilterProtocolList({
    list: displayPortfolios,
    kw: '',
  });

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
    !filteredPortfolios?.length;

  return (
    <div className={className}>
      {isTokensLoading ? (
        <div className="mx-20">
          <TokenListSkeleton />
        </div>
      ) : (
        <TokenList list={sortTokens} isNoResults={isNoResults} />
      )}

      <div>
        {isPortfoliosLoading && isAppPortfoliosLoading ? (
          <TokenListSkeleton />
        ) : (
          <ProtocolList
            removeProtocol={removeProtocol}
            appIds={appIds}
            isSearch={false}
            list={filteredPortfolios}
          />
        )}
      </div>
    </div>
  );
};
