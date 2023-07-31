import {
  PortfolioItem,
  PortfolioItemToken,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { DisplayedProject } from './project';
import { WalletControllerType } from '../WalletContext';
import { requestOpenApiWithChainId } from '@/ui/utils/openapi';
import { isTestnet as checkIsTestnet } from '@/utils/chain';

export const queryTokensCache = async (
  user_id: string,
  wallet: WalletControllerType,
  isTestnet = false
) => {
  return requestOpenApiWithChainId(
    ({ openapi }) => openapi.getCachedTokenList(user_id),
    {
      isTestnet,
      wallet,
    }
  );
};

export const batchQueryTokens = async (
  user_id: string,
  wallet: WalletControllerType,
  chainId?: string,
  isTestnet: boolean = !chainId ? false : checkIsTestnet(chainId)
) => {
  return requestOpenApiWithChainId(
    ({ openapi }) => openapi.listToken(user_id, chainId, true),
    {
      wallet,
      isTestnet,
    }
  );
};

export const batchQueryHistoryTokens = async (
  user_id: string,
  time_at: number,
  wallet: WalletControllerType,
  isTestnet = false
) => {
  return requestOpenApiWithChainId(
    ({ openapi }) =>
      openapi.getHistoryTokenList({ id: user_id, timeAt: time_at }),
    {
      wallet,
      isTestnet,
    }
  );
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
