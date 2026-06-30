import {
  DEX_SUPPORT_CHAINS as RS_DEX_SUPPORT_CHAINS,
  DEX_ROUTER_WHITELIST as RS_DEX_ROUTER_WHITELIST,
  DEX_SPENDER_WHITELIST as RS_DEX_SPENDER_WHITELIST,
} from '@rabby-wallet/rabby-swap';
import { ensureChainHashValid, findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

export const DEX_SUPPORT_CHAINS = Object.entries(RS_DEX_SUPPORT_CHAINS).reduce(
  (accu, [dexItem, value]) => {
    accu[dexItem] = value.filter((chainEnum) => findChainByEnum(chainEnum));
    return accu;
  },
  {} as typeof RS_DEX_SUPPORT_CHAINS
);
export const DEX_ROUTER_WHITELIST = Object.entries(
  RS_DEX_ROUTER_WHITELIST
).reduce((accu, [dexItem, value]) => {
  accu[dexItem] = ensureChainHashValid(value);
  return accu;
}, {} as typeof RS_DEX_ROUTER_WHITELIST);
export const DEX_SPENDER_WHITELIST = Object.entries(
  RS_DEX_SPENDER_WHITELIST
).reduce((accu, [dexItem, value]) => {
  accu[dexItem] = ensureChainHashValid(value);
  return accu;
}, {} as typeof RS_DEX_SPENDER_WHITELIST);

/**
 * 
 * USDT：
ETH: 0xdac17f958d2ee523a2206206994597c13d831ec7
AVAX: 0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7 
Celo: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
 USDC：
ARB: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
AVAX: 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E
Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Celo: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
ETH: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
OP: 0x0b2c639c533813f4aa9d7837caf62653d097ff85
Polygon: 0x3c499c542cef5e3811e1192ce70d8cc03d5c3359
zksync: 0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4
unichain: 0x078D782b760474a361dDA0AF3839290b0EF57AD6
 DAI：
ETH: 0x6b175474e89094c44da98b954eedeac495271d0f
 */

const stableCoinList = ['usdt', 'usdc', 'dai'] as const;

export type StableCoin = typeof stableCoinList[number];

type StableCoinMapT = Record<StableCoin, Partial<Record<CHAINS_ENUM, string>>>;

type StablecoinAggregatedByChainT = Partial<
  Record<CHAINS_ENUM, Partial<Record<StableCoin, string>>>
>;

export const DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID: Record<
  string,
  TokenItem
> = {
  avax: {
    id: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    chain: 'avax',
    name: 'USD Coin',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/avax_token/logo_url/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e/511c3401e4cf1db72608249c7d5a01e6.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0.000035006609682264496,
    time_at: 1637802339,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  eth: {
    id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    chain: 'eth',
    name: 'Tether USD',
    symbol: 'USDT',
    display_symbol: '',
    optimized_symbol: 'USDT',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/eth_token/logo_url/0xdac17f958d2ee523a2206206994597c13d831ec7/1a1d8a5b89114dc183f42b3d33eb3522.png',
    protocol_id: 'tether',
    price: 0.99846,
    price_24h_change: -0.00018024513338135663,
    time_at: 1511829681,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  base: {
    id: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    chain: 'base',
    name: 'USD Coin',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/eth_token/logo_url/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/fffcd27b9efff5a86ab942084c05924d.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0,
    time_at: 1692383789,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  bsc: {
    id: '0x55d398326f99059ff775485246999027b3197955',
    chain: 'bsc',
    name: 'Tether USD',
    symbol: 'USDT',
    display_symbol: null,
    optimized_symbol: 'USDT',
    decimals: 18,
    logo_url:
      'https://static.debank.com/image/coin/logo_url/usdt/23af7472292cb41dc39b3f1146ead0fe.png',
    protocol_id: '',
    price: 0.99846,
    price_24h_change: -0.00018024513338135663,
    time_at: 1599201028,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  hyper: {
    id: '0xb88339cb7199b77e23db6e890353e22632ba630f',
    chain: 'hyper',
    name: 'USDC',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
    protocol_id: '',
    price: 1.0009102967576549,
    price_24h_change: -0.00039471711751804434,
    time_at: 1755006480,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  op: {
    id: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    chain: 'op',
    name: 'USD Coin',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/eth_token/logo_url/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/fffcd27b9efff5a86ab942084c05924d.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0.00010012014417294115,
    time_at: 1668453318,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  matic: {
    id: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    chain: 'matic',
    name: 'USDT0',
    symbol: 'USDT0',
    display_symbol: null,
    optimized_symbol: 'USDT0',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/matic_token/logo_url/0xc2132d05d31c914a87c6611c10748aeb04b58e8f/3a2803ff6129961e8fa48f8b66d06735.png',
    protocol_id: 'matic_usdt0',
    price: 0.99839,
    price_24h_change: -0.0001502042778178157,
    time_at: 1599512847,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  sonic: {
    id: '0x29219dd400f2bf60e5a23d13be72b486d4038894',
    chain: 'sonic',
    name: 'USDC',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0.00010004001600640258,
    time_at: 1734449128,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  uni: {
    id: '0x078d782b760474a361dda0af3839290b0ef57ad6',
    chain: 'uni',
    name: 'USDC',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0.00010012014417294115,
    time_at: 1730847151,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  arb: {
    id: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    chain: 'arb',
    name: 'USD Coin',
    symbol: 'USDC',
    display_symbol: null,
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/arb_token/logo_url/0xaf88d065e77c8cc2239327c5edb3a432268e5831/fffcd27b9efff5a86ab942084c05924d.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0,
    time_at: 1667248932,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  monad: {
    id: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
    chain: 'monad',
    name: 'USDC',
    symbol: 'USDC',
    display_symbol: 'USDC',
    optimized_symbol: 'USDC',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
    protocol_id: '',
    price: 1.001201441730076,
    price_24h_change: 0.00010004001600640258,
    time_at: 1758031902,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
  plasma: {
    id: '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb',
    chain: 'plasma',
    name: 'USDT0',
    symbol: 'USDT0',
    display_symbol: null,
    optimized_symbol: 'USDT0',
    decimals: 6,
    logo_url:
      'https://static.debank.com/image/plasma_token/logo_url/0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb/8bba37fddc2774e06a94b8952e3e3ad7.png',
    protocol_id: 'plasma_usdt0',
    price: 0.99839,
    price_24h_change: -0.00014019206312651232,
    time_at: 1757345331,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    amount: 0,
  },
};

export const getDefaultSwapToTokenItem = (chain?: CHAINS_ENUM) => {
  const chainInfo = chain ? findChainByEnum(chain) : undefined;
  const token = chainInfo
    ? DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID[chainInfo.serverId]
    : undefined;
  return token
    ? {
        ...token,
        is_scam: false,
        is_suspicious: false,
        low_credit_score: false,
        raw_amount: '0',
        raw_amount_hex_str: '0x0',
      }
    : undefined;
};

const stablecoinAddressMap: StableCoinMapT = {
  usdt: {
    [CHAINS_ENUM.ETH]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    [CHAINS_ENUM.AVAX]: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    [CHAINS_ENUM.CELO]: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  },
  usdc: {
    [CHAINS_ENUM.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    [CHAINS_ENUM.AVAX]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    [CHAINS_ENUM.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [CHAINS_ENUM.CELO]: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    [CHAINS_ENUM.ETH]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    [CHAINS_ENUM.OP]: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    [CHAINS_ENUM.POLYGON]: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    [CHAINS_ENUM.ERA]: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4',
    ['UNI' as CHAINS_ENUM]: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
  },
  dai: {
    [CHAINS_ENUM.ETH]: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
};

function aggregateAddresses(addresses: StableCoinMapT) {
  const result: StablecoinAggregatedByChainT = {};

  for (const [token, chains] of Object.entries(addresses) as [
    StableCoin,
    Record<CHAINS_ENUM, string>
  ][]) {
    for (const [chain, address] of Object.entries(chains)) {
      if (!result[chain]) {
        result[chain] = {};
      }
      result[chain][token] = address;
    }
  }

  return result;
}

export const StablecoinMapAggregatedByChain = aggregateAddresses(
  stablecoinAddressMap
);
