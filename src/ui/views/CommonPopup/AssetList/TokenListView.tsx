import React from 'react';
import { TokenSearchInput } from './TokenSearchInput';
import { TokenTabEnum, TokenTabs } from './TokenTabs';
import { useRabbySelector } from '@/ui/store';
import { TokenList } from './TokenList';
import { useQueryProjects } from '@/ui/utils/portfolio';
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
  console.log('portfolios', portfolios);
  console.log('tokenList', tokenList);

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
        <TokenList list={tokenList} />
      </div>
    </div>
  );
};
