import { Chain } from '@debank/common';
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
  const fallbackIdx = !options?.fallback ? null : (
    typeof options?.fallback === 'string' ? options?.fallback : ('ETH' as const)
  );
  const toFallbackEnum: CHAINS_ENUM | null = fallbackIdx
    ? CHAINS_ENUM[fallbackIdx] || CHAINS_ENUM.ETH
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
