import {
  PortfolioItem,
  PortfolioItemToken,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { DisplayedProject } from './project';
import { WalletControllerType } from '../WalletContext';
export const queryTokensCache = async (
  user_id: string,
  wallet: WalletControllerType
) => {
  // getCachedTokenList
  return wallet.openapi.getCachedTokenList(user_id);
};

export const batchQueryTokens = async (
  user_id: string,
  wallet: WalletControllerType
) => {
  return wallet.openapi.listToken(user_id, undefined, true);
};

export const batchQueryHistoryTokens = async (
  user_id: string,
  time_at: number,
  wallet: WalletControllerType
) => {
  return wallet.openapi.getHistoryTokenList({
    id: user_id,
    timeAt: time_at,
  });
};

export const walletProject = new DisplayedProject({
  id: 'Wallet',
  name: 'Wallet',
});

export const setWalletTokens = (
  p?: DisplayedProject,
  tokensDict?: Record<string, TokenItem[]>
) => {
  if (!p || !tokensDict) {
    return;
  }

  Object.entries(tokensDict).forEach(([chain, tokens]) => {
    p?.setPortfolios([
      // 假的结构 portfolio，只是用来对齐结构 PortfolioItem
      {
        pool: {
          id: chain,
        },
        asset_token_list: tokens as PortfolioItemToken[],
      } as PortfolioItem,
    ]);
  });
};

export const sortWalletTokens = (wallet: DisplayedProject) => {
  return wallet._portfolios
    .flatMap((x) => x._tokenList)
    .sort((m, n) => (n._usdValue || 0) - (m._usdValue || 0));
};
