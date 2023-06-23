import React, { useEffect, useMemo } from 'react';
import { TokenSearchInput } from './TokenSearchInput';
import { TokenTabEnum, TokenTabs } from './TokenTabs';
import { useRabbySelector } from '@/ui/store';
import { TokenList } from './TokenList';
import useSortTokens from 'ui/hooks/useSortTokens';
import useSearchToken from '@/ui/hooks/useSearchToken';
import { TokenListViewSkeleton } from './TokenListViewSkeleton';
import { Input } from 'antd';
import { Props as TokenItemProps } from './TokenItem';

interface Props {
  className?: string;
  tokenList: TokenItemProps['item'][];
  isLoading?: boolean;
  hasTokens: boolean;
}

export const TokenListView: React.FC<Props> = ({
  className,
  tokenList,
  isLoading,
  hasTokens,
}) => {
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
  const inputRef = React.useRef<Input>(null);
  const { isLoading: isSearching, list } = useSearchToken(
    currentAccount?.address,
    search
  );
  const displayTokenList = useMemo(() => {
    return search ? list : tokenList;
  }, [list, tokenList, search]);
  const sortTokens = useSortTokens(displayTokenList);

  const handleFocusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  if (isLoading && !hasTokens) {
    return <TokenListViewSkeleton />;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-x-12">
        <TokenSearchInput ref={inputRef} onSearch={handleOnSearch} />
        <TokenTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="mt-18">
        <TokenList list={sortTokens} onFocusInput={handleFocusInput} />
      </div>
    </div>
  );
};
