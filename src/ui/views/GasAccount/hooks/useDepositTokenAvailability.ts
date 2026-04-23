import { CACHE_VALID_DURATION, TOKEN_SYNC_SCENE } from '@/db/constants';
import { syncDbService } from '@/db/services/syncDbService';
import { tokenDbService } from '@/db/services/tokenDbService';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { queryTokensCache } from '@/ui/utils/portfolio/tokenUtils';
import { useWallet } from '@/ui/utils';
import { isFullVersionAccountType } from '@/utils/account';
import {
  GasAccountBridgeSupportTokenList,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import PQueue from 'p-queue';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureGasAccountBridgeSupportTokenList } from '../utils/bridgeSupportTokens';

export type GasAccountDepositTokenType = 'direct' | 'bridge';

export type GasAccountAvailableToken = TokenItem & {
  gasAccountDepositType: GasAccountDepositTokenType;
  owner_addr: string;
};

type GasAccountOwnedToken = TokenItem & {
  owner_addr: string;
};

const GAS_ACCOUNT_ACCOUNT_TOKENS_CACHE_TTL = 60 * 1000;

type AccountTokensCacheItem = {
  tokens: TokenItem[];
  updatedAt: number;
};

type AccountTokensFetchResult = {
  source: 'memory-cache' | 'network' | 'network-error-cache' | 'error';
  tokens: TokenItem[];
};

type AccountTokenMapItem = {
  accountAddress: string;
  tokens: TokenItem[];
};

const SNAPSHOT_TOKENS_CACHE_MAX_SIZE = 50;
const snapshotTokensCache = new Map<string, AccountTokensCacheItem>();
const snapshotTokensInFlight = new Map<
  string,
  Promise<AccountTokensFetchResult>
>();
const GAS_ACCOUNT_TOKEN_REQUEST_TIMEOUT = 10 * 1000;
const GAS_ACCOUNT_TOKEN_REQUEST_CONCURRENCY = 4;
export const DEFAULT_GAS_ACCOUNT_MAX_ACCOUNT_COUNT = 10;

const evictStaleCacheEntries = (
  cache: Map<string, AccountTokensCacheItem>,
  maxSize: number
) => {
  if (cache.size <= maxSize) return;
  const entries = Array.from(cache.entries()).sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt
  );
  const toRemove = entries.slice(0, cache.size - maxSize);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
};

const getOwnedTokenKey = (
  token: Pick<TokenItem, 'chain' | 'id'>,
  owner: string
) => `${owner.toLowerCase()}-${token.chain}-${token.id.toLowerCase()}`;

const buildSupportedTokenSet = (
  tokens: Array<{ chain_id?: string; token_id?: string }>
) => {
  const tokenSet = new Set<string>();

  tokens.forEach((item) => {
    if (item.chain_id && item.token_id) {
      tokenSet.add(`${item.chain_id}:${item.token_id.toLowerCase()}`);
    }
  });

  return tokenSet;
};

const getAccountTokensCacheKey = (address: string) => address.toLowerCase();

const isAccountTokensCacheFresh = (updatedAt: number) =>
  updatedAt > 0 &&
  Date.now() - updatedAt < GAS_ACCOUNT_ACCOUNT_TOKENS_CACHE_TTL;

const isTokenDbFresh = (updatedAt = 0) =>
  updatedAt > 0 && Date.now() - updatedAt < CACHE_VALID_DURATION;

const withTimeout = async <T>(promise: Promise<T>, timeout: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(`GasAccount token request timeout after ${timeout}ms`)
          );
        }, timeout);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const fetchAccountTokensWithCache = async ({
  accountAddress,
  wallet,
  cacheMap,
  inFlightMap,
  request,
  force = false,
}: {
  accountAddress: string;
  wallet: ReturnType<typeof useWallet>;
  cacheMap: Map<string, AccountTokensCacheItem>;
  inFlightMap: Map<string, Promise<AccountTokensFetchResult>>;
  request: (
    accountAddress: string,
    wallet: ReturnType<typeof useWallet>
  ) => Promise<TokenItem[]>;
  force?: boolean;
}) => {
  const cacheKey = getAccountTokensCacheKey(accountAddress);
  const cached = cacheMap.get(cacheKey);

  if (cached && !force && isAccountTokensCacheFresh(cached.updatedAt)) {
    return {
      source: 'memory-cache' as const,
      tokens: cached.tokens,
    };
  }

  const currentInFlight = inFlightMap.get(cacheKey);
  if (currentInFlight) {
    return currentInFlight;
  }

  const nextRequest = withTimeout(
    request(accountAddress, wallet),
    GAS_ACCOUNT_TOKEN_REQUEST_TIMEOUT
  )
    .then((tokens) => {
      const normalizedTokens = tokens || [];
      cacheMap.set(cacheKey, {
        tokens: normalizedTokens,
        updatedAt: Date.now(),
      });
      evictStaleCacheEntries(cacheMap, SNAPSHOT_TOKENS_CACHE_MAX_SIZE);
      return {
        source: 'network' as const,
        tokens: normalizedTokens,
      };
    })
    .catch((error) => {
      console.error('fetchAccountTokensWithCache error', error);
      if (cached) {
        return {
          source: 'network-error-cache' as const,
          tokens: cached.tokens,
        };
      }

      return {
        source: 'error' as const,
        tokens: [],
      };
    })
    .finally(() => {
      inFlightMap.delete(cacheKey);
    });

  inFlightMap.set(cacheKey, nextRequest);
  return nextRequest;
};

const fetchAccountSnapshotTokens = ({
  accountAddress,
  wallet,
  force = false,
}: {
  accountAddress: string;
  wallet: ReturnType<typeof useWallet>;
  force?: boolean;
}) =>
  fetchAccountTokensWithCache({
    accountAddress,
    wallet,
    cacheMap: snapshotTokensCache,
    inFlightMap: snapshotTokensInFlight,
    request: (address, currentWallet) =>
      queryTokensCache(address, currentWallet),
    force,
  });

export const invalidateGasAccountDepositTokensCache = (
  accountAddress: string
) => {
  const cacheKey = getAccountTokensCacheKey(accountAddress);
  snapshotTokensCache.delete(cacheKey);
  snapshotTokensInFlight.delete(cacheKey);
};

const toOwnedTokensFromAccountTokenMap = (
  accountTokensMap: Map<string, AccountTokenMapItem>
) => {
  const tokenMap = new Map<string, GasAccountOwnedToken>();

  accountTokensMap.forEach(({ accountAddress, tokens }) => {
    tokens.forEach((token) => {
      if (token.is_core) {
        tokenMap.set(getOwnedTokenKey(token, accountAddress), {
          ...token,
          owner_addr: accountAddress,
        });
      }
    });
  });

  return Array.from(tokenMap.values());
};

export const getTokenUsdValue = (
  token?: Pick<TokenItem, 'usd_value' | 'amount' | 'price'>
) =>
  Number(
    token?.usd_value || Number(token?.amount || 0) * Number(token?.price || 0)
  );

const isAvailableGasAccountToken = (
  token: GasAccountAvailableToken | null
): token is GasAccountAvailableToken => !!token;

const getAvailableGasAccountDepositTokensFromMap = ({
  accountTokensMap,
  bridgeSupportTokens,
  minDepositPrice = 1,
  disableDirectDeposit = false,
}: {
  accountTokensMap: Map<string, AccountTokenMapItem>;
  bridgeSupportTokens: GasAccountBridgeSupportTokenList;
  minDepositPrice?: number;
  disableDirectDeposit?: boolean;
}) =>
  getAvailableGasAccountDepositTokens(
    toOwnedTokensFromAccountTokenMap(accountTokensMap),
    bridgeSupportTokens,
    minDepositPrice,
    disableDirectDeposit
  );

export const getAvailableGasAccountDepositTokens = (
  tokens: GasAccountOwnedToken[],
  bridgeSupportTokens: GasAccountBridgeSupportTokenList,
  minDepositPrice = 1,
  disableDirectDeposit = false
) => {
  const minDepositUsd = Math.max(1, Number(minDepositPrice || 0));
  const withBalance = tokens.filter(
    (token) => getTokenUsdValue(token) >= minDepositUsd
  );
  const walletTokenSet = buildSupportedTokenSet(
    bridgeSupportTokens.wallet_tokens
  );
  const bridgeTokenSet = buildSupportedTokenSet(
    bridgeSupportTokens.hyperliquid_tokens
  );

  if (!walletTokenSet.size && !bridgeTokenSet.size) {
    return [];
  }

  return withBalance
    .map<GasAccountAvailableToken | null>((token) => {
      const supportKey = `${token.chain}:${token.id.toLowerCase()}`;
      if (!disableDirectDeposit && walletTokenSet.has(supportKey)) {
        return {
          ...token,
          gasAccountDepositType: 'direct',
        };
      }
      if (bridgeTokenSet.has(supportKey)) {
        return {
          ...token,
          gasAccountDepositType: 'bridge',
        };
      }
      return null;
    })
    .filter(isAvailableGasAccountToken)
    .sort((a, b) => getTokenUsdValue(b) - getTokenUsdValue(a));
};

export const useGasAccountDepositAvailableTokens = ({
  minDepositPrice = 1,
  disableDirectDeposit = false,
  maxAccountCount = DEFAULT_GAS_ACCOUNT_MAX_ACCOUNT_COUNT,
}: {
  minDepositPrice?: number;
  disableDirectDeposit?: boolean;
  maxAccountCount?: number;
} = {}) => {
  const wallet = useWallet();
  const { allSortedAccountList, fetchAllAccounts } = useAccounts();
  const requestIdRef = useRef(0);
  const [availableTokens, setAvailableTokens] = useState<
    GasAccountAvailableToken[]
  >([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [hasInitializedAvailability, setHasInitializedAvailability] = useState(
    false
  );
  const minDepositUsd = useMemo(
    () => Math.max(1, Number(minDepositPrice || 0)),
    [minDepositPrice]
  );
  const normalizedMaxAccountCount = useMemo(
    () => Math.max(0, Math.floor(Number(maxAccountCount || 0))),
    [maxAccountCount]
  );

  const myAccounts = useMemo(() => {
    const filteredAccounts = allSortedAccountList.filter((account) => {
      if (!isFullVersionAccountType(account as any)) {
        return false;
      }

      const accountBalance = Number(account.balance);
      if (Number.isFinite(accountBalance) && accountBalance < minDepositUsd) {
        return false;
      }

      return true;
    });

    return sortAccountsByBalance(filteredAccounts).slice(
      0,
      normalizedMaxAccountCount
    );
  }, [allSortedAccountList, minDepositUsd, normalizedMaxAccountCount]);

  const updateAvailableTokens = useCallback(
    async (forceBridgeSupport = false) => {
      const currentRequestId = ++requestIdRef.current;

      if (!myAccounts.length) {
        setAvailableTokens([]);
        setIsCheckingAvailability(false);
        if (allSortedAccountList.length > 0) {
          setHasInitializedAvailability(true);
        }
        return;
      }

      setIsCheckingAvailability(true);

      try {
        const [bridgeSupportTokens, dbAccountStates] = await Promise.all([
          ensureGasAccountBridgeSupportTokenList({
            wallet,
            force: forceBridgeSupport,
          }),
          Promise.all(
            myAccounts.map(async (account) => {
              const [tokens, updatedAt] = await Promise.all([
                tokenDbService.queryTokens(account.address),
                syncDbService.getUpdatedAt({
                  address: account.address,
                  scene: TOKEN_SYNC_SCENE,
                }),
              ]);

              return {
                accountAddress: account.address,
                tokens,
                isFresh: isTokenDbFresh(updatedAt),
              };
            })
          ),
        ]);

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        const accountTokensMap = new Map<string, AccountTokenMapItem>();
        const syncAvailableTokens = () => {
          const nextAvailableTokens = getAvailableGasAccountDepositTokensFromMap(
            {
              accountTokensMap,
              bridgeSupportTokens,
              minDepositPrice,
              disableDirectDeposit,
            }
          );
          setAvailableTokens(nextAvailableTokens);
          return nextAvailableTokens;
        };

        dbAccountStates.forEach(({ accountAddress, tokens }) => {
          if (!tokens.length) {
            return;
          }

          accountTokensMap.set(getAccountTokensCacheKey(accountAddress), {
            accountAddress,
            tokens,
          });
        });

        const initialAvailableTokens = syncAvailableTokens();

        const accountsToRefresh = dbAccountStates
          .filter((item) => !item.isFresh)
          .map((item) => item.accountAddress);

        if (initialAvailableTokens.length > 0 || !accountsToRefresh.length) {
          setIsCheckingAvailability(false);
          setHasInitializedAvailability(true);
        }

        if (!accountsToRefresh.length) {
          return;
        }

        const queue = new PQueue({
          concurrency: GAS_ACCOUNT_TOKEN_REQUEST_CONCURRENCY,
        });

        await Promise.allSettled(
          accountsToRefresh.map((accountAddress) =>
            queue.add(async () => {
              const result = await fetchAccountSnapshotTokens({
                accountAddress,
                wallet,
                force: forceBridgeSupport,
              });

              if (requestIdRef.current !== currentRequestId) {
                return;
              }

              if (result.source === 'error') {
                return;
              }

              const cacheKey = getAccountTokensCacheKey(accountAddress);
              if (result.tokens.length) {
                accountTokensMap.set(cacheKey, {
                  accountAddress,
                  tokens: result.tokens,
                });
              } else {
                accountTokensMap.delete(cacheKey);
              }

              const nextAvailableTokens = syncAvailableTokens();

              if (nextAvailableTokens.length > 0) {
                setIsCheckingAvailability(false);
                setHasInitializedAvailability(true);
              }
            })
          )
        );
      } catch (error) {
        console.error('updateAvailableTokens error', error);
        if (requestIdRef.current === currentRequestId) {
          setAvailableTokens([]);
          setHasInitializedAvailability(true);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsCheckingAvailability(false);
          setHasInitializedAvailability(true);
        }
      }
    },
    [
      allSortedAccountList.length,
      disableDirectDeposit,
      minDepositPrice,
      myAccounts,
      wallet,
    ]
  );

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  return {
    availableTokens,
    hasAvailableTokens: availableTokens.length > 0,
    hasInitializedAvailability,
    isCheckingAvailability,
    refreshAvailableTokens: updateAvailableTokens,
  };
};
