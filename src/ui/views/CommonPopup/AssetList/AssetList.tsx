import { useCommonPopupView } from '@/ui/utils';
import React from 'react';
import { ChainList } from './ChainList';
import { TokenListView } from './TokenListView';
import ProtocolList from './ProtocolList';
import { useQueryProjects } from 'ui/utils/portfolio';
import { useRabbySelector } from '@/ui/store';

export const AssetList = () => {
  const { setHeight } = useCommonPopupView();
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const {
    isTokensLoading,
    isPortfoliosLoading,
    portfolios,
    tokens,
    hasTokens,
    hasPortfolios,
    grossNetWorth,
    tokenNetWorth,
  } = useQueryProjects(currentAccount?.address, false);

  React.useEffect(() => {
    setHeight(494);
  }, []);

  return (
    <div>
      <ChainList />
      <TokenListView
        className="mt-16"
        tokenList={tokens}
        hasTokens={hasTokens}
        isLoading={isTokensLoading}
      />
      <ProtocolList list={portfolios} />
    </div>
  );
};
