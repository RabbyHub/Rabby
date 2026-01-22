import {
  PortfolioItem,
  PortfolioItemToken,
  TokenItem,
  TokenItemWithEntity,
} from '@rabby-wallet/rabby-api/dist/types';
import { CHAINS } from 'consts';
import { DisplayedProject } from './project';
import { WalletControllerType } from '../WalletContext';
import { requestOpenApiWithChainId } from '@/ui/utils/openapi';
import { isTestnet as checkIsTestnet } from '@/utils/chain';
import { pQueue } from './utils';
import { flatten } from 'lodash';
import { isSameAddress } from '..';

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
  isTestnet: boolean = !chainId ? false : checkIsTestnet(chainId),
  isAll: boolean = true
) => {
  if (!chainId && !isTestnet) {
    const usedChains = await wallet.openapi.usedChainList(user_id);
    const chainIdList = usedChains.map((item) => item.id);
    const res = await Promise.all(
      chainIdList.map((serverId) =>
        pQueue.add(() => {
          return requestOpenApiWithChainId(
            ({ openapi }) => openapi.listToken(user_id, serverId, isAll),
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
    ({ openapi }) => openapi.listToken(user_id, chainId, isAll),
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
export const concatAndSort = <
  T extends {
    symbol: string;
    is_core?: boolean | null;
    price?: number;
    amount?: number;
  }
>(
  source: T[],
  appendList: T[],
  keyword: string
): T[] => {
  return source
    .concat(
      appendList.filter((token) =>
        token.symbol.toLowerCase().includes(keyword.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (a.is_core && !b.is_core) {
        return -1;
      }
      if (!a.is_core && b.is_core) {
        return 1;
      }
      const aValue = (a.price ?? 0) * (a.amount ?? 0);
      const bValue = (b.price ?? 0) * (b.amount ?? 0);
      return bValue - aValue;
    });
};

export const contactAmountTokens = (
  withoutAmountTokens: TokenItemWithEntity[],
  withAmountTokens: TokenItem[]
) => {
  return withoutAmountTokens.map((item) => {
    const _targetToken = withAmountTokens.find(
      (token) => isSameAddress(token.id, item.id) && token.chain === item.chain
    );
    return {
      ...item,
      amount: _targetToken?.amount || item.amount || 0,
      raw_amount: _targetToken?.raw_amount || item.raw_amount || '0',
      raw_amount_hex_str:
        _targetToken?.raw_amount_hex_str || item.raw_amount_hex_str || '',
    };
  });
};

export const getCexIds = (token: TokenItemWithEntity) => {
  return (
    token.cex_ids || token.identity?.cex_list?.map((item) => item.id) || []
  );
};
