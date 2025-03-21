import {
  DEX_SUPPORT_CHAINS as RS_DEX_SUPPORT_CHAINS,
  DEX_ROUTER_WHITELIST as RS_DEX_ROUTER_WHITELIST,
  DEX_SPENDER_WHITELIST as RS_DEX_SPENDER_WHITELIST,
} from '@rabby-wallet/rabby-swap';
import { ensureChainHashValid, findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';

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
