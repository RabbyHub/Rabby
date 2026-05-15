import React, { useEffect, useMemo } from 'react';
import { TokenSearchInput } from './TokenSearchInput';
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
import { InputRef } from 'antd';
import { useFilterProtocolList } from './useFilterProtocolList';
import { useAppChain } from '@/ui/hooks/useAppChain';
import { useCommonPopupView } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { LpTokenSwitch } from '../../DesktopProfile/components/TokensTabPane/components/LpTokenSwitch';
import { HomePerpsPositionList } from './HomePerpsPositionList';
import { uniqBy } from 'lodash';
import { concatAndSort } from '@/ui/utils/portfolio/tokenUtils';
import { NftPreviewSection } from './NftPreviewSection';

interface Props {
  className?: string;
  selectChainId: string | null;
  visible: boolean;
  onEmptyAssets: (isEmpty: boolean) => void;
}

export const AssetListContainer: React.FC<Props> = ({
  className,
  selectChainId,
  visible,
  onEmptyAssets,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState<string>('');
  const [lpTokenMode, setLpTokenMode] = React.useState(false);
  const handleOnSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);
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
  } = useQueryProjects(currentAccount?.address, {
    visible,
    lpTokenMode: lpTokenMode ? lpTokenMode : undefined,
    searchMode: !!search,
  });
  const {
    data: appPortfolios,
    isLoading: isAppPortfoliosLoading,
  } = useAppChain(currentAccount?.address, visible);

  const inputRef = React.useRef<InputRef>(null);
  const { isLoading: isSearching, list } = useSearchToken(
    currentAccount?.address,
    search,
    {
      chainServerId: selectChainId ? selectChainId : undefined,
      withBalance: true,
      isTestnet: false,
    }
  );
  const displayTokenList = useMemo(() => {
    const result = uniqBy(
      search ? concatAndSort(list, tokenList, search) : tokenList,
      (token) => {
        return `${token.chain}-${token.id}`;
      }
    );
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

  const isEmptyAssets =
    !isTokensLoading &&
    !displayTokenList.length &&
    !isPortfoliosLoading &&
    !displayPortfolios?.length &&
    !isAppPortfoliosLoading &&
    !appPortfolios?.length;

  React.useEffect(() => {
    onEmptyAssets(isEmptyAssets && !lpTokenMode);
  }, [isEmptyAssets, onEmptyAssets, lpTokenMode]);

  const sortTokens = useSortTokens(displayTokenList);
  const filteredPortfolios = useFilterProtocolList({
    list: displayPortfolios,
    kw: search,
  });

  React.useEffect(() => {
    if (!visible) {
      setSearch('');
      inputRef.current?.focus();
      inputRef.current?.blur();
      setLpTokenMode(false);
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
        <div className="flex w-full items-center justify-between">
          <div className="relative w-[60%] leading-[1]">
            <TokenSearchInput
              ref={inputRef}
              placeholder={t('page.dashboard.assets.searchTokenPlaceholder')}
              onSearch={handleOnSearch}
              className="w-full"
            />
          </div>
          <LpTokenSwitch
            lpTokenMode={lpTokenMode}
            onLpTokenModeChange={setLpTokenMode}
          />
        </div>
      </div>
      {isTokensLoading || isSearching || (lpTokenMode && isAllTokenLoading) ? (
        <TokenListSkeleton />
      ) : (
        <div className="mt-[12px]">
          <HomeTokenList
            list={sortTokens}
            isSearch={!!search}
            lpTokenMode={lpTokenMode}
            isNoResults={isNoResults}
          />
        </div>
      )}

      <div
        style={{
          display: visible ? 'block' : 'none',
        }}
        className="pt-[24px]"
      >
        {isPortfoliosLoading && isAppPortfoliosLoading ? (
          <TokenListSkeleton />
        ) : (
          <>
            {visible && !search ? (
              <HomePerpsPositionList needFetchMarket />
            ) : null}
            <ProtocolList
              removeProtocol={removeProtocol}
              appIds={appIds}
              isSearch={!!search}
              list={filteredPortfolios}
              className="mt-0"
            />
            <NftPreviewSection className="mt-[28px] cursor-pointer" />
          </>
        )}
      </div>
    </div>
  );
};
