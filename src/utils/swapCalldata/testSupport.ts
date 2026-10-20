import type { CHAINS_ENUM } from '@debank/common';
import { DEX_ENUM, DEX_SUPPORT_CHAINS } from '@rabby-wallet/rabby-swap';

export const CALLDATA_TEST_DEXES = [DEX_ENUM.UNI, DEX_ENUM.MAGPIE];

// Match the backend's enabled DEX handlers and globally supported chains.
const BACKEND_UNSUPPORTED_CHAINS: Partial<
  Record<DEX_ENUM, readonly string[]>
> = {
  [DEX_ENUM.UNI]: ['CELO', 'MONAD'],
  [DEX_ENUM.MAGPIE]: ['FTM', 'PZE', 'STABLE'],
};

export const isCalldataTestDex = (dex: string) =>
  CALLDATA_TEST_DEXES.some((target) => target === dex);

export const getCalldataTestDexes = (
  chain: CHAINS_ENUM,
  available: readonly string[] = CALLDATA_TEST_DEXES
) =>
  CALLDATA_TEST_DEXES.filter(
    (dex) =>
      available.includes(dex) &&
      DEX_SUPPORT_CHAINS[dex].includes(chain) &&
      !BACKEND_UNSUPPORTED_CHAINS[dex]?.includes(chain)
  );

export const CALLDATA_TEST_CHAINS = Array.from(
  new Set(CALLDATA_TEST_DEXES.flatMap((dex) => DEX_SUPPORT_CHAINS[dex]))
).filter((chain) => getCalldataTestDexes(chain).length > 0);
