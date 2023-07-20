import {
  PortfolioItem,
  PortfolioItemToken,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { DisplayedProject } from './project';
import { WalletControllerType } from '../WalletContext';
import {
  requestOpenApiMultipleNets,
  requestOpenApiWithChainId,
} from '@/ui/utils/openapi';
import { findChainByServerID } from '@/utils/chain';

export const queryTokensCache = async (
  user_id: string,
  wallet: WalletControllerType,
  isTestnet = false,
) => {
  return requestOpenApiMultipleNets(
    ({ openapi }) => openapi.getCachedTokenList(user_id),
    {
      needTestnetResult: isTestnet,
      wallet,
      processResults: ({ mainnet, testnet }) => {
        return mainnet.concat(testnet);
      },
      fallbackValues: {
        mainnet: [],
        testnet: [],
      },
    }
  );
};

export const batchQueryTokens = async (
  user_id: string,
  wallet: WalletControllerType,
  chainId?: string,
  isTestnet?: boolean
) => {
  const isShowTestnet = await wallet.getIsShowTestnet();
  const chainItem = chainId ? findChainByServerID(chainId) : null;

  if (chainItem) {
    return requestOpenApiWithChainId(
      ({ openapi }) => openapi.listToken(user_id, chainId, true),
      {
        wallet,
        isTestnet: isTestnet === undefined ? chainItem.isTestnet : isTestnet,
      }
    );
  }

  return requestOpenApiMultipleNets(
    ({ openapi }) => openapi.listToken(user_id, chainId, true),
    {
      needTestnetResult: isShowTestnet,
      wallet,
      processResults: ({ mainnet, testnet }) => {
        return mainnet.concat(testnet);
      },
      fallbackValues: {
        mainnet: [],
        testnet: [],
      },
    }
  );
};

export const batchQueryHistoryTokens = async (
  user_id: string,
  time_at: number,
  wallet: WalletControllerType,
  isTestnet = false
) => {
  return requestOpenApiMultipleNets(
    ({ openapi }) =>
      openapi.getHistoryTokenList({ id: user_id, timeAt: time_at }),
    {
      needTestnetResult: isTestnet,
      wallet,
      processResults: ({ mainnet, testnet }) => {
        return mainnet.concat(testnet);
      },
      fallbackValues: {
        mainnet: [],
        testnet: [],
      },
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
