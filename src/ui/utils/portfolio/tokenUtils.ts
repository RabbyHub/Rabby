import {
  PortfolioItem,
  PortfolioItemToken,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { CHAINS } from 'consts';
import { DisplayedProject } from './project';
import { WalletControllerType } from '../WalletContext';
import { requestOpenApiWithChainId } from '@/ui/utils/openapi';
import { isTestnet as checkIsTestnet } from '@/utils/chain';
import { pQueue } from './utils';
import { flatten } from 'lodash';

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
  if (!chainId && !isTestnet) {
    const usedChains = await wallet.openapi.usedChainList(user_id);
    const chainIdList = usedChains.map((item) => item.id);
    const res = await Promise.all(
      chainIdList.map((serverId) =>
        pQueue.add(() => {
          return requestOpenApiWithChainId(
            ({ openapi }) => openapi.listToken(user_id, serverId, true),
            {
              wallet,
              isTestnet,
            }
          );
        })
      )
    );
    return flatten(res);
  }
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
