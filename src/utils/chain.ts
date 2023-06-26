import { Chain } from '@debank/common';
import { ChainWithBalance } from '@rabby-wallet/rabby-api/dist/types';
import { CHAINS, CHAINS_ENUM } from 'consts';

const ALL_CHAINS = Object.values(CHAINS);

/**
 * @description safe find chain, if not found, return fallback(if provided) or null
 */
export function findChainByEnum(
  chainEnum?: CHAINS_ENUM | string,
  options?: {
    fallback?: true | CHAINS_ENUM;
  }
): Chain | null {
  const toFallbackEnum: CHAINS_ENUM | null = options?.fallback
    ? CHAINS_ENUM[options?.fallback as any] || CHAINS_ENUM.ETH
    : null;
  const toFallbackChain = toFallbackEnum ? CHAINS[toFallbackEnum] : null;

  if (!chainEnum) return toFallbackChain;

  return CHAINS[chainEnum] || toFallbackChain;
}

export function filterChainEnum(chainEnum: CHAINS_ENUM) {
  return findChainByEnum(chainEnum)?.enum || null;
}

export function ensureChainHashValid<
  T extends {
    [K in CHAINS_ENUM]?: any;
  }
>(obj: T) {
  const newObj = <T>{};
  Object.entries(obj).forEach(([chainEnum, value]) => {
    if (findChainByEnum(chainEnum)) {
      newObj[chainEnum as any] = value;
    }
  });

  return newObj;
}

export function ensureChainListValid<T extends CHAINS_ENUM[]>(list: T) {
  return list.filter((chainEnum) => findChainByEnum(chainEnum));
}

/**
 * @description safe find chain
 */
export function findChainByID(chainId: Chain['id']): Chain | null {
  return !chainId
    ? null
    : ALL_CHAINS.find((chain) => chain.id === chainId) || null;
}

/**
 * @description safe find chain by serverId
 */
export function findChainByServerID(chainId: Chain['serverId']): Chain | null {
  return !chainId
    ? null
    : ALL_CHAINS.find((chain) => chain.serverId === chainId) || null;
}

export interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

export function formatChainToDisplay(
  item: ChainWithBalance
): DisplayChainWithWhiteLogo {
  const chainsArray = Object.values(CHAINS);
  const chain = chainsArray.find((chain) => chain.id === item.community_id);

  return {
    ...item,
    logo: chain?.logo || item.logo_url,
    whiteLogo: chain?.whiteLogo,
  };
}

export function sortChainItems<T extends Chain>(
  items: T[],
  opts?: {
    cachedChainBalances?: {
      [P in Chain['serverId']]?: DisplayChainWithWhiteLogo;
    };
    supportChains?: CHAINS_ENUM[];
  }
) {
  const { cachedChainBalances = {}, supportChains } = opts || {};

  return (
    items
      // .map((item, index) => ({
      //   ...item,
      //   index,
      // }))
      .sort((a, b) => {
        const aBalance = cachedChainBalances[a.serverId]?.usd_value || 0;
        const bBalance = cachedChainBalances[b.serverId]?.usd_value || 0;

        if (!supportChains) {
          return aBalance > bBalance ? -1 : 1;
        }

        if (supportChains.includes(a.enum) && !supportChains.includes(b.enum)) {
          return -1;
        }
        if (!supportChains.includes(a.enum) && supportChains.includes(b.enum)) {
          return 1;
        }

        return aBalance > bBalance ? -1 : 1;
      })
  );
}
