import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { Account } from 'background/service/preference';
import { gasAccountService, openapiService } from 'background/service';
import type { GasAccountServiceStore } from 'background/service/gasAccount';
import PQueue from 'p-queue';

const DIRECT_SIGN_TYPES = new Set<string>([
  KEYRING_TYPE.SimpleKeyring,
  KEYRING_TYPE.HdKeyring,
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.ONEKEY,
]);

const HARDWARE_DIRECT_SIGN_TYPES = new Set<string>([
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.ONEKEY,
]);

export const isGasAccountDirectSignType = (type?: string) =>
  !!type && DIRECT_SIGN_TYPES.has(type);

export const isGasAccountHardwareType = (type?: string) =>
  !!type && HARDWARE_DIRECT_SIGN_TYPES.has(type);

const hasGasAccountBalance = (balance?: number, noRegister?: boolean) =>
  !noRegister && Number(balance || 0) > 0;

export const GAS_ACCOUNT_DISCOVERY_TOP_BALANCE_ACCOUNT_LIMIT = 20;
const DISCOVERY_CACHE_TTL = 60 * 1000;
const GAS_ACCOUNT_INFO_CONCURRENCY = 6;

let cachedDiscoveryKey = '';
let cachedDiscoveryAt = 0;
let discoveryInFlightKey = '';
let discoveryInFlight: Promise<GasAccountServiceStore> | null = null;
let latestDiscoveryRequestId = 0;

type GasAccountDiscoveryOptions = {
  force?: boolean;
} | null;

type GasAccountDiscoveryBalanceResult = {
  account: Account;
  balance: number;
};

const getVisibleAccountsKey = (accounts: Account[]) =>
  accounts
    .map(
      (account) =>
        `${account.address.toLowerCase()}:${account.type}:${account.brandName}`
    )
    .sort()
    .join('|');

const getDiscoveryCacheKey = (visibleAccounts: Account[]) => {
  const { accountId } = gasAccountService.getGasAccountSig();
  const hasSession = gasAccountService.hasGasAccountSession();
  return `${
    hasSession ? accountId?.toLowerCase() || 'session' : 'no-session'
  }::${getVisibleAccountsKey(visibleAccounts)}`;
};

const isDiscoveryCacheFresh = (cacheKey: string) =>
  cachedDiscoveryKey === cacheKey &&
  Date.now() - cachedDiscoveryAt < DISCOVERY_CACHE_TTL;

const updateDiscoveryCache = (cacheKey: string) => {
  cachedDiscoveryKey = cacheKey;
  cachedDiscoveryAt = Date.now();
};

const isDiscoveryBalanceResult = (
  item: GasAccountDiscoveryBalanceResult | null
): item is GasAccountDiscoveryBalanceResult => !!item;

const queryAccountGasAccountBalance = async (
  account: Account
): Promise<GasAccountDiscoveryBalanceResult | null> => {
  try {
    const info = await openapiService.getGasAccountInfoV2({
      id: account.address,
    });

    if (
      !hasGasAccountBalance(info?.account?.balance, info?.account?.no_register)
    ) {
      return null;
    }

    return {
      account,
      balance: Number(info.account.balance || 0),
    };
  } catch {
    return null;
  }
};

export const discoverGasAccountRuntimeState = async (
  accounts: Account[],
  options?: GasAccountDiscoveryOptions
) => {
  const force = !!options?.force;
  const cacheKey = getDiscoveryCacheKey(accounts);

  if (!force && isDiscoveryCacheFresh(cacheKey)) {
    return gasAccountService.getGasAccountData();
  }

  if (discoveryInFlight && discoveryInFlightKey === cacheKey) {
    return discoveryInFlight;
  }

  const requestId = ++latestDiscoveryRequestId;
  const syncDiscoveryState = (
    payload: Pick<
      GasAccountServiceStore,
      | 'pendingHardwareAccount'
      | 'autoLoginAccount'
      | 'accountsWithGasAccountBalance'
    >
  ) => {
    if (requestId !== latestDiscoveryRequestId) {
      return gasAccountService.getGasAccountData();
    }
    gasAccountService.setDiscoveryState(payload);
    updateDiscoveryCache(cacheKey);
    return gasAccountService.getGasAccountData();
  };

  if (!accounts.length) {
    return syncDiscoveryState({
      pendingHardwareAccount: undefined,
      autoLoginAccount: undefined,
      accountsWithGasAccountBalance: [],
    });
  }

  discoveryInFlightKey = cacheKey;
  discoveryInFlight = (async () => {
    const queue = new PQueue({
      concurrency: GAS_ACCOUNT_INFO_CONCURRENCY,
    });
    const responses = await Promise.all(
      accounts.map((account) =>
        queue.add(() => queryAccountGasAccountBalance(account))
      )
    );

    const accountsWithGasAccountBalance = responses
      .filter(isDiscoveryBalanceResult)
      .sort((a, b) => (b?.balance || 0) - (a?.balance || 0))
      .map(({ account }) => ({
        address: account.address,
        type: account.type,
        brandName: account.brandName,
      }));
    const loginCandidateAccountsWithGasAccountBalance = accountsWithGasAccountBalance.filter(
      (account) => isGasAccountDirectSignType(account.type)
    );
    const hasSession = gasAccountService.hasGasAccountSession();
    const autoLoginAccount = hasSession
      ? undefined
      : loginCandidateAccountsWithGasAccountBalance.find(
          (account) => !isGasAccountHardwareType(account.type)
        );
    return syncDiscoveryState({
      autoLoginAccount,
      pendingHardwareAccount:
        hasSession || autoLoginAccount
          ? undefined
          : loginCandidateAccountsWithGasAccountBalance.find((account) =>
              isGasAccountHardwareType(account.type)
            ),
      accountsWithGasAccountBalance,
    });
  })().finally(() => {
    if (discoveryInFlightKey === cacheKey) {
      discoveryInFlight = null;
      discoveryInFlightKey = '';
    }
  });

  return discoveryInFlight;
};
