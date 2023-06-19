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

interface Props {
  className?: string;
}

export const TokenListView: React.FC<Props> = ({ className }) => {
  const [search, setSearch] = React.useState<string>('');

  const handleOnSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);

  // for test
  const [tokens, setTokens] = React.useState<TokenItem[]>([]);
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const wallet = useWallet();
  const sortTokensByPrice = (tokens: TokenItem[]) => {
    const copy = cloneDeep(tokens);
    return copy.sort((a, b) => {
      return new BigNumber(b.amount)
        .times(new BigNumber(b.price || 0))
        .minus(new BigNumber(a.amount).times(new BigNumber(a.price || 0)))
        .toNumber();
    });
  };
  React.useEffect(() => {
    wallet.openapi.listToken(currentAccount?.address || '').then((res) => {
      const result = sortTokensByPrice(
        uniqBy([...res], (token) => {
          return `${token.chain}-${token.id}`;
        })
      );

      setTokens(result);
    });
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <TokenSearchInput onSearch={handleOnSearch} />
        <TokenTabs />
      </div>
      <div className="mt-18">
        <TokenList list={tokens} />
      </div>
    </div>
  );
};
