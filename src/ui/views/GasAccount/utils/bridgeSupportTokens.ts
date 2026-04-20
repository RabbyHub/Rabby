import { GasAccountBridgeSupportTokenList } from '@rabby-wallet/rabby-api/dist/types';

export const EMPTY_GAS_ACCOUNT_BRIDGE_SUPPORT_TOKEN_LIST: GasAccountBridgeSupportTokenList = {
  hyperliquid_tokens: [],
  wallet_tokens: [],
};

export const GAS_ACCOUNT_BRIDGE_SUPPORT_CACHE_TTL = 30 * 60 * 1000;

export const normalizeGasAccountBridgeSupportTokenList = (
  value?: GasAccountBridgeSupportTokenList | null
): GasAccountBridgeSupportTokenList => ({
  hyperliquid_tokens: value?.hyperliquid_tokens || [],
  wallet_tokens: value?.wallet_tokens || [],
});

export const hasGasAccountBridgeSupportTokens = (
  value?: GasAccountBridgeSupportTokenList | null
) => !!(value?.hyperliquid_tokens?.length || value?.wallet_tokens?.length);

export const isGasAccountBridgeSupportTokenListFresh = (updatedAt = 0) =>
  updatedAt > 0 &&
  Date.now() - updatedAt < GAS_ACCOUNT_BRIDGE_SUPPORT_CACHE_TTL;

type GasAccountBridgeSupportTokenWallet = {
  openapi: {
    getGasAccountBridgeSupportTokenList(): Promise<GasAccountBridgeSupportTokenList>;
  };
};

type GasAccountBridgeSupportTokenCache = {
  status: 'idle' | 'success' | 'error';
  data: GasAccountBridgeSupportTokenList;
  updatedAt: number;
};

let bridgeSupportTokenListCache: GasAccountBridgeSupportTokenCache = {
  status: 'idle',
  data: EMPTY_GAS_ACCOUNT_BRIDGE_SUPPORT_TOKEN_LIST,
  updatedAt: 0,
};

let bridgeSupportTokenListInFlight: Promise<GasAccountBridgeSupportTokenList> | null = null;

export const ensureGasAccountBridgeSupportTokenList = async ({
  wallet,
  force = false,
}: {
  wallet: GasAccountBridgeSupportTokenWallet;
  force?: boolean;
}) => {
  if (
    !force &&
    bridgeSupportTokenListCache.status === 'success' &&
    isGasAccountBridgeSupportTokenListFresh(
      bridgeSupportTokenListCache.updatedAt
    )
  ) {
    return bridgeSupportTokenListCache.data;
  }

  if (bridgeSupportTokenListInFlight) {
    return bridgeSupportTokenListInFlight;
  }

  const previousCache = bridgeSupportTokenListCache;

  bridgeSupportTokenListInFlight = wallet.openapi
    .getGasAccountBridgeSupportTokenList()
    .then((result) => {
      const normalized = normalizeGasAccountBridgeSupportTokenList(result);
      bridgeSupportTokenListCache = {
        status: 'success',
        data: normalized,
        updatedAt: Date.now(),
      };
      return normalized;
    })
    .catch((error) => {
      console.error('ensureGasAccountBridgeSupportTokenList error', error);
      bridgeSupportTokenListCache = previousCache.updatedAt
        ? previousCache
        : {
            status: 'error',
            data: EMPTY_GAS_ACCOUNT_BRIDGE_SUPPORT_TOKEN_LIST,
            updatedAt: 0,
          };
      return bridgeSupportTokenListCache.data;
    })
    .finally(() => {
      bridgeSupportTokenListInFlight = null;
    });

  return bridgeSupportTokenListInFlight;
};

export const prefetchGasAccountBridgeSupportTokenList = async ({
  wallet,
}: {
  wallet: GasAccountBridgeSupportTokenWallet;
}) => {
  return ensureGasAccountBridgeSupportTokenList({ wallet });
};
