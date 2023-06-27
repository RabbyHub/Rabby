import { Token as CustomizedToken } from '@/background/service/preference';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import {
  walletProject,
  setWalletTokens,
  sortWalletTokens,
} from '@/ui/utils/portfolio/tokenUtils';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import produce from 'immer';
import React from 'react';

export const useCustomizedToken = () => {
  const wallet = useWallet();
  const [tokens, setTokens] = React.useState<AbstractPortfolioToken[]>();
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const add = React.useCallback(async (token: CustomizedToken) => {
    await wallet.addCustomizedToken(token);
    getAll();
  }, []);

  const remove = React.useCallback(async (token: CustomizedToken) => {
    await wallet.removeCustomizedToken(token);
    getAll();
  }, []);

  const getAll = React.useCallback(async () => {
    const list = await wallet.getCustomizedToken();
    const uuids = list.map((item) => `${item.chain}:${item.address}`);
    const tokenRes = await wallet.openapi.customListToken(
      uuids,
      currentAccount!.address
    );
    const tokensDict: Record<string, TokenItem[]> = {};
    tokenRes.forEach((token) => {
      if (!tokensDict[token.chain]) {
        tokensDict[token.chain] = [];
      }
      tokensDict[token.chain].push(token);
    });

    let _data = produce(walletProject, (draft) => {
      draft.netWorth = 0;
      draft._netWorth = '$0';
      draft._netWorthChange = '-';
      draft.netWorthChange = 0;
      draft._netWorthChangePercent = '';
    });
    _data = produce(_data, (draft) => {
      setWalletTokens(draft, tokensDict);
    });
    const customizedTokens = sortWalletTokens(_data);

    setTokens(customizedTokens);
  }, []);

  React.useEffect(() => {
    getAll();
  }, []);

  return {
    add,
    remove,
    tokens,
  };
};
