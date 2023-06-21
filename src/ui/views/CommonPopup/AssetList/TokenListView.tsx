import React, { useEffect, useMemo } from 'react';
import { TokenSearchInput } from './TokenSearchInput';
import { TokenTabEnum, TokenTabs } from './TokenTabs';
import { useRabbySelector } from '@/ui/store';
import { TokenList } from './TokenList';
import { useQueryProjects } from '@/ui/utils/portfolio';
import useSortTokens from 'ui/hooks/useSortTokens';
import useSearchToken from '@/ui/hooks/useSearchToken';
import { TokenListViewSkeleton } from './TokenListViewSkeleton';

interface Props {
  className?: string;
}

export const TokenListView: React.FC<Props> = ({ className }) => {
  const [search, setSearch] = React.useState<string>('');
  const handleOnSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const [activeTab, setActiveTab] = React.useState<TokenTabEnum>(
    TokenTabEnum.List
  );
  const {
    isTokensLoading,
    isPortfoliosLoading,
    portfolios,
    tokens: tokenList,
    hasTokens,
    hasPortfolios,
    grossNetWorth,
    tokenNetWorth,
  } = useQueryProjects(currentAccount?.address, false);
  const { isLoading, list } = useSearchToken(currentAccount?.address, search);
  const displayTokenList = useMemo(() => {
    return search ? list : tokenList;
  }, [list, tokenList, search]);
  const sortTokens = useSortTokens(displayTokenList);

  if (isTokensLoading || isPortfoliosLoading) {
    return <TokenListViewSkeleton />;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-x-12">
        <TokenSearchInput onSearch={handleOnSearch} />
        <TokenTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="mt-18">
        <TokenList list={sortTokens} />
      </div>
    </div>
  );
};
