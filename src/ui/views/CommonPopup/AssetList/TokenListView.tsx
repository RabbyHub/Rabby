import React from 'react';
import { TokenSearchInput } from './TokenSearchInput';
import { TokenTabs } from './TokenTabs';
import { TokenItem } from '@debank/rabby-api/dist/types';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { TokenList } from './TokenList';
import uniqBy from 'lodash/uniqBy';
import cloneDeep from 'lodash/cloneDeep';
import BigNumber from 'bignumber.js';
import { useQueryProjects } from '@/ui/utils/portfolio';

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

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <TokenSearchInput onSearch={handleOnSearch} />
        <TokenTabs />
      </div>
      <div className="mt-18">
        <TokenList list={tokenList} />
      </div>
    </div>
  );
};
