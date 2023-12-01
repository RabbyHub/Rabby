import React, { useMemo } from 'react';
import { TokenSearchInput } from './TokenSearchInput';
import { TokenTabEnum, TokenTabs } from './TokenTabs';
import { useRabbySelector } from '@/ui/store';
import { TokenList } from './TokenList';
import useSortTokens from 'ui/hooks/useSortTokens';
import useSearchToken from '@/ui/hooks/useSearchToken';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from './TokenListViewSkeleton';
import ProtocolList from './ProtocolList';
import { useQueryProjects } from 'ui/utils/portfolio';
import { Input } from 'antd';
import { SummaryList } from './SummaryList';
import { HistoryList } from './HisotryList';
import { useFilterProtocolList } from './useFilterProtocolList';

interface Props {
  className?: string;
  selectChainId: string | null;
  visible: boolean;
  onEmptyAssets: (isEmpty: boolean) => void;
  isTestnet?: boolean;
}

export const AssetListContainer: React.FC<Props> = ({
  className,
  selectChainId,
  visible,
  onEmptyAssets,
  isTestnet = false,
}) => {
  const [search, setSearch] = React.useState<string>('');
  const handleOnSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const {
    isTokensLoading,
    isPortfoliosLoading,
    portfolios,
    tokens: tokenList,
    hasTokens,
    blockedTokens,
    customizeTokens,
  } = useQueryProjects(currentAccount?.address, false, visible, isTestnet);
  const [activeTab, setActiveTab] = React.useState<TokenTabEnum>(
    TokenTabEnum.List
  );
  const isEmptyAssets =
    !isTokensLoading &&
    !tokenList.length &&
    !isPortfoliosLoading &&
    !portfolios?.length &&
    !blockedTokens?.length &&
    !customizeTokens?.length;

  React.useEffect(() => {
    onEmptyAssets(isEmptyAssets);
  }, [isEmptyAssets]);

  const inputRef = React.useRef<Input>(null);
  const { isLoading: isSearching, list } = useSearchToken(
    currentAccount?.address,
    search,
    selectChainId ? selectChainId : undefined,
    true,
    isTestnet
  );
  const displayTokenList = useMemo(() => {
    const result = search ? list : tokenList;
    if (selectChainId) {
      return result.filter((item) => item.chain === selectChainId);
    }
    return result;
  }, [list, tokenList, search, selectChainId]);

  const displayPortfolios = useMemo(() => {
    if (selectChainId) {
      return portfolios?.filter((item) => item.chain === selectChainId);
    }
    return portfolios;
  }, [portfolios, selectChainId]);

  const sortTokens = useSortTokens(displayTokenList);
  const filteredPortfolios = useFilterProtocolList({
    list: displayPortfolios,
    kw: search,
  });

  const handleFocusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setActiveTab(TokenTabEnum.List);
      setSearch('');
      inputRef.current?.setValue('');
      inputRef.current?.focus();
      inputRef.current?.blur();
    }
  }, [visible]);

  if (isTokensLoading && !hasTokens) {
    return <TokenListViewSkeleton />;
  }

  const isNoResults =
    !isSearching &&
    !isTokensLoading &&
    !isPortfoliosLoading &&
    !!search &&
    !sortTokens.length &&
    !filteredPortfolios?.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-x-12 widget-has-ant-input">
        <TokenSearchInput ref={inputRef} onSearch={handleOnSearch} />
        <TokenTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      {isTokensLoading || isSearching ? (
        <TokenListSkeleton />
      ) : (
        <div className="mt-18">
          {(activeTab === TokenTabEnum.List || search) && (
            <TokenList
              list={sortTokens}
              onFocusInput={handleFocusInput}
              isSearch={!!search}
              isNoResults={isNoResults}
              blockedTokens={blockedTokens}
              customizeTokens={customizeTokens}
              isTestnet={isTestnet}
            />
          )}
          {activeTab === TokenTabEnum.Summary && !search && (
            <SummaryList chainId={selectChainId} />
          )}
          {activeTab === TokenTabEnum.History && !search && <HistoryList />}
        </div>
      )}

      <div
        style={{
          display:
            visible &&
            activeTab !== TokenTabEnum.Summary &&
            activeTab !== TokenTabEnum.History
              ? 'block'
              : 'none',
        }}
      >
        {isPortfoliosLoading ? (
          <TokenListSkeleton />
        ) : (
          <ProtocolList isSearch={!!search} list={filteredPortfolios} />
        )}
      </div>
    </div>
  );
};
