import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useInViewport } from 'ahooks';
import { message } from 'antd';
import { uniqBy } from 'lodash';
import { useRef } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import {
  useGasAccountRefreshId,
  useGasAccountSetRefreshId,
  useGasAccountHistoryRefreshId,
  useGasAccountSetHistoryRefreshId,
} from './context';
import { sendPersonalMessage } from '@/ui/utils/sendPersonalMessage';
import pRetry from 'p-retry';
import { Account } from '@/background/service/preference';
import { personalMessagePromise } from '../../Approval/components/MiniPersonalMessgae/MiniSignPersonalMessage';
import {
  supportedDirectSign,
  supportedHardwareDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { SignatureSteps } from '@/ui/component/MiniSignV2';
import { KEYRING_TYPE } from '@/constant';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { ellipsisAddress } from '@/ui/utils/address';
import { GasAccountCheckResult } from '@/background/service/openapi';
import { useTranslation } from 'react-i18next';
import { GAS_ACCOUNT_INSUFFICIENT_TIP } from './checkTxs';
import { useGasAccountDepositFlowActive } from './runtime';

type GasAccountEligibleAddress = {
  address: string;
  giftUsdValue: number;
  isEligible: boolean;
  account: Account;
};

const GAS_ACCOUNT_INFO_V2_CACHE_TTL = 1500;
const gasAccountInfoV2Cache = new Map<
  string,
  {
    updatedAt: number;
    value: any;
  }
>();
const gasAccountInfoV2InFlight = new Map<string, Promise<any>>();

const getGasAccountInfoV2CacheKey = (address: string) => address.toLowerCase();

const fetchCachedGasAccountInfoV2 = async (
  wallet: ReturnType<typeof useWallet>,
  address: string
) => {
  const cacheKey = getGasAccountInfoV2CacheKey(address);
  const cached = gasAccountInfoV2Cache.get(cacheKey);
  if (cached && Date.now() - cached.updatedAt < GAS_ACCOUNT_INFO_V2_CACHE_TTL) {
    return cached.value;
  }

  const inflight = gasAccountInfoV2InFlight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = wallet.openapi
    .getGasAccountInfoV2({ id: address })
    .then((value) => {
      gasAccountInfoV2Cache.set(cacheKey, {
        updatedAt: Date.now(),
        value,
      });
      return value;
    })
    .finally(() => {
      gasAccountInfoV2InFlight.delete(cacheKey);
    });

  gasAccountInfoV2InFlight.set(cacheKey, request);
  return request;
};

export const useGasAccountRefresh = () => {
  const refreshId = useGasAccountRefreshId();
  const setRefreshId = useGasAccountSetRefreshId();

  const refresh = useCallback(() => {
    setRefreshId((e) => e + 1);
  }, [setRefreshId]);

  return { refreshId, refresh };
};

export const useGasAccountHistoryRefresh = () => {
  const refreshHistoryId = useGasAccountHistoryRefreshId();
  const setRefreshHistoryId = useGasAccountSetHistoryRefreshId();

  const refreshHistory = useCallback(() => {
    setRefreshHistoryId((e) => e + 1);
  }, [setRefreshHistoryId]);

  return { refreshHistoryId, refreshHistory };
};

export const useGasAccountSign = () => {
  return useRabbySelector((s) => ({
    sig: s.gasAccount.sig,
    accountId: s.gasAccount.accountId,
    account: s.gasAccount.account,
    pendingHardwareAccount: s.gasAccount.pendingHardwareAccount,
    autoLoginAccount: s.gasAccount.autoLoginAccount,
    accountsWithGasAccountBalance:
      s.gasAccount.accountsWithGasAccountBalance || [],
  }));
};

export const useGasAccountInfo = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const wallet = useWallet();

  const { sig, accountId } = useGasAccountSign();
  const dispatch = useRabbyDispatch();

  const { refreshId } = useGasAccountRefresh();
  const invalidateSession = useCallback(() => {
    dispatch.gasAccount.setGasAccountSig({});
    wallet.setGasAccountBalanceState();
    dispatch.gasAccount.discoverRuntimeState(undefined).catch((error) => {
      console.error(
        '[gasAccount] rediscover after invalid session failed',
        error
      );
    });
  }, [dispatch, wallet]);

  const { value, loading, error } = useAsync(async () => {
    if (!enabled || !sig || !accountId) return undefined;

    const response = await wallet.openapi.getGasAccountInfo({
      sig,
      id: accountId,
    });
    if (response.account.id) {
      return response;
    }

    invalidateSession();
    return undefined;
  }, [accountId, enabled, invalidateSession, refreshId, sig]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (
      error?.message?.includes('gas account verified failed') &&
      sig &&
      accountId
    ) {
      invalidateSession();
    }
  }, [accountId, enabled, error?.message, invalidateSession, sig]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!sig || !accountId) {
      wallet.setGasAccountBalanceState();
      return;
    }

    const responseAccount = value?.account;
    if (!responseAccount?.id || !isSameAddress(responseAccount.id, accountId)) {
      return;
    }

    wallet.setGasAccountBalanceState(
      accountId,
      Number(responseAccount.balance || 0) > 0
    );
  }, [
    wallet,
    enabled,
    sig,
    accountId,
    value?.account?.id,
    value?.account?.balance,
  ]);

  return { loading, value };
};

export const useGasAccountInfoV2 = ({
  address,
  enabled = true,
}: {
  address?: string;
  enabled?: boolean;
}) => {
  const wallet = useWallet();

  const { value, loading } = useAsync(async () => {
    if (!enabled || !address) return undefined;
    return fetchCachedGasAccountInfoV2(wallet, address);
  }, [address, enabled, wallet]);

  return { value, loading };
};

export const useGasAccountBalance = (gasAccountAddress?: string) => {
  const shouldQuerySpecificAddress = !!gasAccountAddress;
  const { value: gasAccountInfo } = useGasAccountInfo({
    enabled: !shouldQuerySpecificAddress,
  });
  const fallbackAddress = shouldQuerySpecificAddress
    ? gasAccountAddress
    : gasAccountInfo?.account?.id;
  const { value: fallbackGasAccountInfo } = useGasAccountInfoV2({
    address: fallbackAddress,
    enabled: !!fallbackAddress,
  });

  return Number(
    shouldQuerySpecificAddress
      ? fallbackGasAccountInfo?.account?.balance || 0
      : gasAccountInfo?.account?.balance ||
          fallbackGasAccountInfo?.account?.balance ||
          0
  );
};

export const useGasAccountMethods = () => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const { sig, accountId } = useGasAccountSign();
  const { refresh } = useGasAccountRefresh();
  const { refreshHistory } = useGasAccountHistoryRefresh();

  const getSignMessage = useCallback(
    async (account: Account) => {
      const { text } = await wallet.openapi.getGasAccountSignText(
        account.address
      );

      return text;
    },
    [wallet, dispatch, refresh, refreshHistory]
  );

  const handleLoginOnSig = useCallback(
    async (account: Account, signature: string, isClaimGift: boolean) => {
      const result = await pRetry(
        async () =>
          wallet.openapi.loginGasAccount({
            sig: signature,
            account_id: account.address,
          }),
        { retries: 2 }
      );

      if (result?.success) {
        await wallet.handleGasAccountLoginSuccess(signature, account);
        dispatch.gasAccount.syncState(undefined);
        if (isClaimGift) {
          await wallet.claimGasAccountGift(account.address);
        }
        dispatch.gift.markGiftAsClaimed({ address: account.address });
        wallet.markGiftAsClaimed();
        refresh();
        refreshHistory();
        return signature;
      }
    },
    [wallet, refresh, refreshHistory]
  );

  const handleNoSignLogin = useCallback(
    async (account: Account, isClaimGift: boolean = false) => {
      if (!account) return '';

      try {
        const { text } = await wallet.openapi.getGasAccountSignText(
          account.address
        );

        const miniSign = supportedHardwareDirectSign(account.type);
        let signature = '';
        if (miniSign) {
          const [hash] = (await personalMessagePromise.present({
            autoSign: true,
            account,
            directSubmit: true,
            canUseDirectSubmitTx: true,
            txs: [{ data: [text, account.address] }],
          })) as string[];

          signature = hash;
        } else {
          if (account.type === KEYRING_TYPE.HdKeyring) {
            await SignatureSteps.invokeEnterPassphraseModal({
              wallet: wallet,
              value: account.address,
            });
          }

          const { txHash } = await sendPersonalMessage({
            data: [text, account.address],
            wallet,
            account,
          });
          signature = txHash;
        }

        return (await handleLoginOnSig(account, signature, isClaimGift)) || '';
      } catch (e) {
        message.error('Login in error, Please retry');
      }
      return '';
    },
    [handleLoginOnSig, wallet]
  );

  const login = useCallback(
    async (account: Account, isClaimGift: boolean = false) => {
      if (account && supportedDirectSign(account.type)) {
        return handleNoSignLogin(account, isClaimGift);
      }

      return wallet.signGasAccount(account, isClaimGift);
    },
    [handleNoSignLogin, wallet]
  );

  const logout = useCallback(async () => {
    if (!sig || !accountId) {
      return;
    }

    const result = await wallet.openapi.logoutGasAccount({
      sig,
      account_id: accountId,
    });
    if (result.success) {
      dispatch.gasAccount.setGasAccountSig({});
    } else {
      message.error('please retry');
    }
  }, [sig, accountId, wallet, dispatch]);

  return { login, logout, getSignMessage, handleLoginOnSig };
};

export const useGasAccountLogin = ({
  loading,
  value,
}: ReturnType<typeof useGasAccountInfo>) => {
  const { sig, accountId } = useGasAccountSign();

  const { login, logout } = useGasAccountMethods();

  const isLogin = useMemo(
    () => (!loading ? !!value?.account?.id : !!sig && !!accountId),
    [sig, accountId, loading, value?.account?.id]
  );

  return { login, logout, isLogin };
};

export const useGasAccountDiscovery = ({
  autoRefresh = true,
}: {
  autoRefresh?: boolean;
} = {}) => {
  const dispatch = useRabbyDispatch();
  const discovery = useRabbySelector((s) => ({
    pendingHardwareAccount: s.gasAccount.pendingHardwareAccount,
    autoLoginAccount: s.gasAccount.autoLoginAccount,
    accountsWithGasAccountBalance:
      s.gasAccount.accountsWithGasAccountBalance || [],
  }));
  const autoLoginInFlight = useRef(false);
  const { login } = useGasAccountMethods();

  const refreshDiscovery = useCallback(
    async (options?: { force?: boolean }) => {
      return dispatch.gasAccount.discoverRuntimeState(options);
    },
    [dispatch]
  );

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    refreshDiscovery();
  }, [autoRefresh, refreshDiscovery]);

  useEffect(() => {
    if (!discovery.autoLoginAccount?.address || autoLoginInFlight.current) {
      return;
    }

    autoLoginInFlight.current = true;
    login(discovery.autoLoginAccount)
      .catch((error) => {
        console.error('[gasAccount] auto login failed', error);
      })
      .finally(() => {
        autoLoginInFlight.current = false;
      });
  }, [discovery.autoLoginAccount, login]);

  return {
    ...discovery,
    refreshDiscovery,
  };
};

export const useGasAccountEligibility = () => {
  const wallet = useWallet();
  const { allSortedAccountList } = useAccounts();
  const { sig, accountId, pendingHardwareAccount } = useGasAccountSign();
  const { login } = useGasAccountMethods();
  const hasClaimedGift = useRabbySelector((s) => s.gift.hasClaimedGift);
  const [currentEligibleAddress, setCurrentEligibleAddress] = useState<
    GasAccountEligibleAddress | undefined
  >(undefined);

  const eligibleAccounts = useMemo(
    () =>
      allSortedAccountList.filter(
        (account) =>
          supportedDirectSign(account.type) &&
          !supportedHardwareDirectSign(account.type)
      ) as Account[],
    [allSortedAccountList]
  );

  const checkAddressesEligibility = useCallback(async () => {
    if (sig || accountId || pendingHardwareAccount || hasClaimedGift) {
      setCurrentEligibleAddress(undefined);
      return undefined;
    }

    const results = await Promise.allSettled(
      eligibleAccounts.map(async (account) => ({
        account,
        result: await wallet.openapi.checkGasAccountGiftEligibility({
          id: account.address,
        }),
      }))
    );

    for (const settled of results) {
      if (settled.status !== 'fulfilled') continue;
      const { account, result } = settled.value;
      if (!result.has_eligibility) continue;

      const nextEligibleAddress = {
        address: account.address,
        giftUsdValue: Number(result.can_claimed_usd_value || 0),
        isEligible: true,
        account,
      };
      setCurrentEligibleAddress(nextEligibleAddress);
      return nextEligibleAddress;
    }

    setCurrentEligibleAddress(undefined);
    return undefined;
  }, [
    accountId,
    eligibleAccounts,
    hasClaimedGift,
    pendingHardwareAccount,
    sig,
    wallet,
  ]);

  useEffect(() => {
    if (sig || accountId || pendingHardwareAccount || hasClaimedGift) {
      setCurrentEligibleAddress(undefined);
    }
  }, [accountId, hasClaimedGift, pendingHardwareAccount, sig]);

  const claimGift = useCallback(
    async (address?: string) => {
      const targetAccount =
        eligibleAccounts.find((item) =>
          isSameAddress(item.address, address || '')
        ) || currentEligibleAddress?.account;

      if (!targetAccount) {
        throw new Error('No eligible address available');
      }

      await login(targetAccount, true);
      setCurrentEligibleAddress(undefined);
      return true;
    },
    [currentEligibleAddress?.account, eligibleAccounts, login]
  );

  return {
    claimGift,
    currentEligibleAddress,
    checkAddressesEligibility,
  };
};

export const usePendingHardwareGasAccountLogin = ({
  enabled = false,
  gasAccountCost,
  currentGasAccountAddress,
  onLoggedIn,
}: {
  enabled?: boolean;
  gasAccountCost?: GasAccountCheckResult & { err_msg?: string };
  currentGasAccountAddress?: string;
  onLoggedIn?: () => void | Promise<void>;
}) => {
  const { t } = useTranslation();
  const { sig, accountId, pendingHardwareAccount } = useGasAccountSign();
  const { login } = useGasAccountMethods();
  const { allSortedAccountList } = useAccounts();
  const [isLoggingPendingHardware, setIsLoggingPendingHardware] = useState(
    false
  );

  const pendingHardwareLoginAccount = useMemo(
    () =>
      pendingHardwareAccount?.address
        ? (allSortedAccountList.find((item) =>
            isSameAddress(item.address, pendingHardwareAccount.address)
          ) as Account | undefined)
        : undefined,
    [allSortedAccountList, pendingHardwareAccount?.address]
  );

  const pendingHardwareAddress = pendingHardwareLoginAccount?.address;
  const isInsufficientOnly = useMemo(() => {
    if (!gasAccountCost || gasAccountCost.chain_not_support) {
      return false;
    }

    const isInsufficientError =
      gasAccountCost.err_msg?.toLowerCase() ===
      GAS_ACCOUNT_INSUFFICIENT_TIP.toLowerCase();
    const hasOtherError = !!gasAccountCost.err_msg && !isInsufficientError;

    return (
      !hasOtherError &&
      (!gasAccountCost.balance_is_enough || isInsufficientError)
    );
  }, [gasAccountCost]);

  const isAddressMismatch =
    !!pendingHardwareAddress &&
    !!currentGasAccountAddress &&
    !isSameAddress(pendingHardwareAddress, currentGasAccountAddress);

  const shouldLoadPendingHardwareBalance =
    enabled &&
    !sig &&
    !accountId &&
    !!pendingHardwareAddress &&
    isInsufficientOnly &&
    isAddressMismatch;
  const { value: pendingHardwareGasAccountInfo } = useGasAccountInfoV2({
    address: pendingHardwareAddress,
    enabled: shouldLoadPendingHardwareBalance,
  });

  const pendingHardwareBalance = Number(
    pendingHardwareGasAccountInfo?.account?.balance || 0
  );
  const requiredTotalCost = Number(
    gasAccountCost?.gas_account_cost?.total_cost ||
      (gasAccountCost?.gas_account_cost?.estimate_tx_cost || 0) +
        (gasAccountCost?.gas_account_cost?.gas_cost || 0)
  );

  const hasEnoughPendingHardwareBalance =
    shouldLoadPendingHardwareBalance &&
    (Number.isFinite(requiredTotalCost) && requiredTotalCost > 0
      ? pendingHardwareBalance >= requiredTotalCost
      : pendingHardwareBalance > 0);

  const shouldSignWithPendingHardware =
    enabled &&
    !sig &&
    !accountId &&
    !!pendingHardwareAddress &&
    isInsufficientOnly &&
    isAddressMismatch &&
    hasEnoughPendingHardwareBalance;

  const pendingHardwareAddressLabel =
    (pendingHardwareLoginAccount as any)?.alianName ||
    ellipsisAddress(pendingHardwareLoginAccount?.address || '');

  const handleSignWithPendingHardware = useCallback(async () => {
    if (
      !shouldSignWithPendingHardware ||
      !pendingHardwareLoginAccount ||
      isLoggingPendingHardware
    ) {
      return false;
    }

    setIsLoggingPendingHardware(true);
    try {
      const sig = await login(pendingHardwareLoginAccount);
      if (sig) {
        message.success(
          t('page.gasAccount.loginSuccess', {
            defaultValue: 'GasAccount login successful',
          })
        );
        await onLoggedIn?.();
        return true;
      }
      return false;
    } catch (error) {
      console.error('login pending hardware gas account error', error);
      message.error(
        t('page.gasAccount.loginFailed', {
          defaultValue: 'GasAccount login failed',
        })
      );
      return false;
    } finally {
      setIsLoggingPendingHardware(false);
    }
  }, [
    isLoggingPendingHardware,
    login,
    onLoggedIn,
    pendingHardwareLoginAccount,
    shouldSignWithPendingHardware,
    t,
  ]);

  return {
    shouldSignWithPendingHardware,
    pendingHardwareAddressLabel,
    isLoggingPendingHardware,
    handleSignWithPendingHardware,
    pendingHardwareGasAccountInfo,
  };
};

export const useGasAccountHistory = () => {
  const { sig, accountId } = useGasAccountSign();

  const wallet = useWallet();
  const depositFlowActive = useGasAccountDepositFlowActive();
  const { refresh: refreshGasAccountBalance } = useGasAccountRefresh();
  const { refreshHistoryId } = useGasAccountHistoryRefresh();

  type History = Awaited<
    ReturnType<typeof wallet.openapi.getGasAccountHistory>
  >;

  type HistoryTxList = {
    rechargeList: History['recharge_list'];
    withdrawList: History['withdraw_list'];
    list: History['history_list'];
    totalCount: number;
  };

  const [txList, setTxList] = useState<HistoryTxList>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestVersionRef = useRef(0);
  const pendingPollCountRef = useRef(0);
  const txListRef = useRef<HistoryTxList>();
  const historyAccountIdRef = useRef<string>();

  useEffect(() => {
    txListRef.current = txList;
  }, [txList]);

  const buildTxList = useCallback(
    (data: History, previousList?: History['history_list']) => ({
      rechargeList: data.recharge_list || [],
      withdrawList: data.withdraw_list || [],
      list: previousList
        ? uniqBy(
            [...(data.history_list || []), ...previousList],
            (item) => `${item?.create_at}` as string
          )
        : data.history_list || [],
      totalCount: data.pagination.total,
    }),
    []
  );

  const clearHistory = useCallback(() => {
    requestVersionRef.current += 1;
    pendingPollCountRef.current = 0;
    txListRef.current = undefined;
    setLoading(false);
    setLoadingMore(false);
    setTxList(undefined);
  }, []);

  const refreshListTx = useCallback(
    async ({
      preserveLoadedList = false,
    }: { preserveLoadedList?: boolean } = {}) => {
      if (!sig || !accountId) {
        clearHistory();
        return;
      }

      const requestVersion = ++requestVersionRef.current;
      const previousTxList = txListRef.current;

      if (!previousTxList) {
        setLoading(true);
      }

      try {
        const data = await wallet.openapi.getGasAccountHistory({
          sig,
          account_id: accountId,
          start: 0,
          limit: 5,
        });

        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const nextTxList = buildTxList(
          data,
          preserveLoadedList ? previousTxList?.list : undefined
        );

        setTxList(nextTxList);

        if (
          previousTxList &&
          (previousTxList.rechargeList.length !==
            nextTxList.rechargeList.length ||
            previousTxList.withdrawList.length !==
              nextTxList.withdrawList.length)
        ) {
          refreshGasAccountBalance();
        }
      } catch (error) {
        console.error('refresh gas account history error', error);
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setLoading(false);
        }
      }
    },
    [
      accountId,
      buildTxList,
      clearHistory,
      refreshGasAccountBalance,
      sig,
      wallet,
    ]
  );

  const loadMoreHistory = useCallback(async () => {
    const currentTxList = txListRef.current;
    const loadedCount = currentTxList
      ? currentTxList.list.length +
        currentTxList.rechargeList.length +
        currentTxList.withdrawList.length
      : 0;

    if (
      !sig ||
      !accountId ||
      !currentTxList ||
      loading ||
      loadingMore ||
      currentTxList.totalCount <= loadedCount
    ) {
      return;
    }

    setLoadingMore(true);
    const requestVersion = requestVersionRef.current;

    try {
      const data = await wallet.openapi.getGasAccountHistory({
        sig,
        account_id: accountId,
        start: currentTxList.list.length,
        limit: 5,
      });

      if (requestVersion !== requestVersionRef.current) {
        return;
      }

      setTxList((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          list: [...previous.list, ...(data.history_list || [])],
          totalCount: data.pagination.total,
        };
      });
    } catch (error) {
      console.error('load more gas account history error', error);
    } finally {
      setLoadingMore(false);
    }
  }, [accountId, loading, loadingMore, sig, wallet]);

  const noMore = useMemo(() => {
    if (!txList) {
      return true;
    }

    const loadedCount =
      txList.list.length +
      txList.rechargeList.length +
      txList.withdrawList.length;

    return txList.totalCount <= loadedCount;
  }, [txList]);

  useEffect(() => {
    const prevHistoryAccountId = historyAccountIdRef.current;
    historyAccountIdRef.current = accountId;

    if (!sig || !accountId) {
      clearHistory();
      return;
    }

    const switchedAccount =
      !!prevHistoryAccountId && !isSameAddress(prevHistoryAccountId, accountId);

    if (switchedAccount) {
      clearHistory();
    }

    refreshListTx({
      preserveLoadedList: !switchedAccount,
    });
  }, [accountId, clearHistory, refreshHistoryId, refreshListTx, sig]);

  const ref = useRef<HTMLDivElement>(null);

  const [inViewport] = useInViewport(ref);

  useEffect(() => {
    if (
      !depositFlowActive &&
      !noMore &&
      inViewport &&
      !loadingMore &&
      loadMoreHistory
    ) {
      loadMoreHistory();
    }
  }, [
    depositFlowActive,
    inViewport,
    loadMoreHistory,
    loading,
    loadingMore,
    noMore,
  ]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const hasSomePending = Boolean(
      txList?.rechargeList?.length || txList?.withdrawList?.length
    );
    const MAX_PENDING_POLLS = 30;
    const PENDING_POLL_DELAY = 2000;

    if (
      !depositFlowActive &&
      !loading &&
      !loadingMore &&
      hasSomePending &&
      pendingPollCountRef.current < MAX_PENDING_POLLS
    ) {
      pendingPollCountRef.current += 1;

      timer = setTimeout(() => {
        refreshListTx({
          preserveLoadedList: true,
        });
      }, PENDING_POLL_DELAY);
    }
    if (!hasSomePending && pendingPollCountRef.current) {
      pendingPollCountRef.current = 0;
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [depositFlowActive, loading, loadingMore, refreshListTx, txList]);

  return {
    loading,
    txList,
    loadingMore,
    ref,
  };
};

export const useAml = () => {
  const { accountId } = useGasAccountSign();
  const wallet = useWallet();

  const { value } = useAsync(async () => {
    if (accountId) {
      return wallet.openapi.getGasAccountAml(accountId);
    }
    return {
      is_risk: false,
    };
  }, [accountId]);

  return value?.is_risk;
};
