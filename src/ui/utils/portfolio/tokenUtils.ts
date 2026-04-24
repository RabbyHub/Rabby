import {
  PortfolioItem,
  PortfolioItemToken,
  TokenItem,
  TokenItemWithEntity,
} from '@rabby-wallet/rabby-api/dist/types';
import { CHAINS } from 'consts';
import { DisplayedProject, encodeProjectTokenId } from './project';
import { WalletControllerType } from '../WalletContext';
import { requestOpenApiWithChainId } from '@/ui/utils/openapi';
import {
  isTestnet as checkIsTestnet,
  findChain,
  findChainByEnum,
} from '@/utils/chain';
import { pQueue } from './utils';
import { flatten, uniqBy } from 'lodash';
import { formatAmount, formatPrice, formatUsdValue, isSameAddress } from '..';
import { AbstractPortfolioToken } from './types';
import { getTokenSymbol } from '../token';

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

export const scamTokenFilter = (item: {
  is_suspicious?: boolean | null;
  is_verified?: boolean | null;
  is_core?: boolean | null;
}) => {
  const manualTagScam = item.is_verified === false;
  const maybeScam = item.is_suspicious === true;
  const manualTagNotCore = item.is_core === false;
  if (manualTagScam || maybeScam || manualTagNotCore) {
    return false;
  }
  return true;
};

export const buildTokenKey = (token: Pick<TokenItem, 'chain' | 'id'>) =>
  `${token.chain}-${token.id.toLowerCase()}`;

export const uniqTokens = (tokens: TokenItem[]) => {
  return uniqBy(tokens, buildTokenKey);
};

// 过滤掉无效的链
export const filterValidChainTokens = (tokens: AbstractPortfolioToken[]) => {
  return tokens.filter((token) => {
    const chain = findChain({
      serverId: token.chain,
    });
    return findChainByEnum(chain?.enum);
  });
};

/** 替换核心 token (缓存接口没有非 core 的 token */
export const replaceCoreTokens = (
  tokens: TokenItem[],
  cacheTokens: TokenItem[]
) => {
  return uniqTokens([
    ...tokens.filter((token) => !token.is_core),
    ...cacheTokens,
  ]);
};

export const replaceTokensWithLatest = (
  tokens: TokenItem[],
  latestTokens: TokenItem[],
  chainServerId?: string
) => {
  if (!chainServerId) {
    return uniqTokens(latestTokens);
  }

  return uniqTokens([
    ...latestTokens,
    ...tokens.filter((token) => token.chain !== chainServerId),
  ]);
};

export const groupTokensByChain = (tokens: TokenItem[]) => {
  return tokens.reduce((m, n) => {
    m[n.chain] = m[n.chain] || [];
    m[n.chain].push(n);

    return m;
  }, {} as Record<string, TokenItem[]>);
};

export const parseTokenItem = (token: TokenItem): AbstractPortfolioToken => {
  const formattedPrice = token.price || 0;
  const formattedAmount = token.amount || 0;
  const realUsdValue = formattedPrice * formattedAmount;
  const usdValue = Math.abs(realUsdValue);
  return {
    id: encodeProjectTokenId(token),
    _tokenId: token.id,
    chain: token.chain,
    symbol: getTokenSymbol(token),
    logo_url: token.logo_url,
    amount: formattedAmount,
    price: formattedPrice,
    _realUsdValue: realUsdValue,
    // 注意这里，debt 也被处理成正值
    _usdValue: usdValue,
    _amountStr: formatAmount(Math.abs(formattedAmount)),
    _priceStr: formatPrice(formattedPrice),
    _usdValueStr: formatUsdValue(usdValue),

    decimals: token.decimals,
    display_symbol: token.display_symbol,
    name: token.name,
    optimized_symbol: token.optimized_symbol,
    is_core: token.is_core,
    is_wallet: token.is_wallet,
    is_verified: token.is_verified,
    is_suspicious: token.is_suspicious,
    time_at: token.time_at,
    price_24h_change: token.price_24h_change,
    low_credit_score: token.low_credit_score,
    raw_amount_hex_str: token.raw_amount_hex_str,
    cex_ids: token.cex_ids || [],
    protocol_id: token.protocol_id,

    _amountChangeStr: '',
    _usdValueChangeStr: '-',
    _amountChangeUsdValueStr: '',
  };
};

export const sortTokenItems = (tokens: TokenItem[]) => {
  return tokens
    .map(parseTokenItem)
    .sort((m, n) => (n._usdValue || 0) - (m._usdValue || 0));
};
