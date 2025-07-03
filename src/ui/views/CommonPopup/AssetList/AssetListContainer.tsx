import React, { useEffect, useMemo } from 'react';
import { TokenSearchInput } from './TokenSearchInput';
import AddTokenEntry, { AddTokenEntryInst } from './AddTokenEntry';
import { useRabbySelector } from '@/ui/store';
import { HomeTokenList } from './TokenList';
import useSortTokens from 'ui/hooks/useSortTokens';
import useSearchToken from '@/ui/hooks/useSearchToken';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from './TokenListViewSkeleton';
import ProtocolList from './ProtocolList';
import { useQueryProjects } from 'ui/utils/portfolio';
import { Input } from 'antd';
import { useFilterProtocolList } from './useFilterProtocolList';
import { useAppChain } from '@/ui/hooks/useAppChain';
import { useCommonPopupView } from '@/ui/utils';

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
  const [isFocus, setIsFocus] = React.useState<boolean>(false);
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
  } = useQueryProjects(currentAccount?.address, false, visible, isTestnet);
  const {
    data: appPortfolios,
    isLoading: isAppPortfoliosLoading,
  } = useAppChain(currentAccount?.address, visible, isTestnet);

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

  const isEmptyAssets =
    !isTokensLoading &&
    !displayTokenList.length &&
    !isPortfoliosLoading &&
    !displayPortfolios?.length &&
    !displayBlockedTokens?.length &&
    !displayCustomizeTokens?.length &&
    !isAppPortfoliosLoading &&
    !appPortfolios?.length;

  React.useEffect(() => {
    onEmptyAssets(isEmptyAssets);
  }, [isEmptyAssets, onEmptyAssets]);

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
      setSearch('');
      inputRef.current?.setValue('');
      inputRef.current?.focus();
      inputRef.current?.blur();
    }
  }, [visible]);

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

  const addTokenEntryRef = React.useRef<AddTokenEntryInst>(null);

  if (isTokensLoading && !hasTokens) {
    return <TokenListViewSkeleton />;
  }

  const isNoResults =
    !isSearching &&
    !isTokensLoading &&
    !isPortfoliosLoading &&
    !isAppPortfoliosLoading &&
    !!search &&
    !sortTokens.length &&
    !filteredPortfolios?.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-x-12 widget-has-ant-input">
        <TokenSearchInput
          ref={inputRef}
          onSearch={handleOnSearch}
          onFocus={() => {
            setIsFocus(true);
          }}
          onBlur={() => {
            setIsFocus(false);
          }}
          className={isFocus || search ? 'w-[360px]' : 'w-[160px]'}
        />
        {isFocus || search ? null : <AddTokenEntry ref={addTokenEntryRef} />}
      </div>
      {isTokensLoading || isSearching ? (
        <TokenListSkeleton />
      ) : (
        <div className="mt-18">
          <HomeTokenList
            list={sortTokens}
            onFocusInput={handleFocusInput}
            onOpenAddEntryPopup={() => {
              addTokenEntryRef.current?.startAddToken();
            }}
            isSearch={!!search}
            isNoResults={isNoResults}
            blockedTokens={displayBlockedTokens}
            customizeTokens={displayCustomizeTokens}
            isTestnet={isTestnet}
            selectChainId={selectChainId}
          />
        </div>
      )}

      <div
        style={{
          display: visible ? 'block' : 'none',
        }}
      >
        {isPortfoliosLoading && isAppPortfoliosLoading ? (
          <TokenListSkeleton />
        ) : (
          <ProtocolList
            appIds={appIds}
            isSearch={!!search}
            list={filteredPortfolios}
          />
        )}
      </div>
    </div>
  );
};
