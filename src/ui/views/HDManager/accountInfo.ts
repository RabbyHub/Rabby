import PQueue from 'p-queue';
import { createAddressBalanceLoader } from '@/ui/utils/addressBalanceLoader';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import type { Account } from './AccountList';

type AccountInfo = Pick<Account, 'chains' | 'balance' | 'firstTxTime'>;
type AccountInfoApi = Pick<
  WalletControllerType['openapi'],
  'usedChainList' | 'getTotalBalance' | 'getAppChainList'
>;

const CACHE_DURATION = 10 * 60 * 1000;
const CACHE_LIMIT = 200;

export const createAccountInfoLoader = (openapi: AccountInfoApi) => {
  const balanceLoader = createAddressBalanceLoader(openapi);
  const chainQueue = new PQueue({
    concurrency: 2,
    intervalCap: 5,
    interval: 1000,
  });
  const chainCache = new Map<
    string,
    { chains: Account['chains']; expiresAt: number }
  >();
  const pending = new Map<string, Promise<AccountInfo>>();

  const loadChains = (address: string) => {
    const cached = chainCache.get(address);
    if (cached && cached.expiresAt > Date.now()) {
      chainCache.delete(address);
      chainCache.set(address, cached);
      return Promise.resolve(cached.chains);
    }
    chainCache.delete(address);
    return chainQueue
      .add(() => openapi.usedChainList(address))
      .then((chains) => {
        chainCache.set(address, {
          chains,
          expiresAt: Date.now() + CACHE_DURATION,
        });
        if (chainCache.size > CACHE_LIMIT) {
          chainCache.delete(chainCache.keys().next().value!);
        }
        return chains;
      });
  };

  const load = (address: string): Promise<AccountInfo> => {
    if (!address) return Promise.resolve({});
    const key = address.toLowerCase();
    const existing = pending.get(key);
    if (existing) return existing;

    // Each source keeps its own TTL. Retrying one must not extend the other.
    const request = Promise.allSettled([
      loadChains(key),
      // AppChain assets can exist without any EVM chain activity.
      balanceLoader.load(key),
    ])
      .then(([chainsResult, balanceResult]) => {
        const chains =
          chainsResult.status === 'fulfilled' ? chainsResult.value : undefined;
        let firstTxTime: number | undefined;
        chains?.forEach((chain) => {
          // The API returns born_at, but UsedChain in the SDK omits it.
          const { born_at } = chain as typeof chain & {
            born_at?: number | null;
          };
          if (born_at) {
            firstTxTime = Math.min(firstTxTime ?? Infinity, born_at);
          }
        });
        const info: AccountInfo = {
          chains,
          firstTxTime,
          balance:
            balanceResult.status === 'fulfilled'
              ? balanceResult.value
              : undefined,
        };
        return info;
      })
      .finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };

  return { load };
};

const loaders = new WeakMap<
  WalletControllerType,
  ReturnType<typeof createAccountInfoLoader>
>();

export const getAccountInfoLoader = (wallet: WalletControllerType) => {
  let loader = loaders.get(wallet);
  if (!loader) {
    loader = createAccountInfoLoader(wallet.openapi);
    loaders.set(wallet, loader);
  }
  return loader;
};
