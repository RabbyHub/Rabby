import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useAsync } from 'react-use';

import { isFullVersionAccountType } from '@/utils/account';
import { syncDbService } from '@/db/services/syncDbService';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import { tokenDbService } from '@/db/services/tokenDbService';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { CACHE_VALID_DURATION, TOKEN_SYNC_SCENE } from '@/db/constants';
import { findChain } from '@/utils/chain';

import { isSameAddress } from '..';
import { log } from './usePortfolio';
import { useSafeState } from '../safeState';
import { useWallet } from '../WalletContext';
import { AbstractPortfolioToken } from './types';
import {
  defaultTokenFilter,
  includeLpTokensFilter,
  isLpToken,
} from './lpToken';
import {
  batchQueryTokens,
  queryTokensCache,
  filterValidChainTokens,
  replaceCoreTokens,
  replaceTokensWithLatest,
  parseTokenItem,
  sortTokenItems,
} from './tokenUtils';

let lastResetTokenListAddr = '';

type UseTokensOptions = {
  visible?: boolean;
  updateNonce?: number;
  chainServerId?: string;
  lpTokensOnly?: boolean;
  searchMode?: boolean;
  disableRecommended?: boolean;
  realtimeMode?: boolean;
};

export const useTokens = (
  userAddr: string | undefined,
  {
    visible = true,
    updateNonce = 0,
    chainServerId,
    lpTokensOnly = false,
    searchMode = false,
    disableRecommended = false,
    realtimeMode = false,
  }: UseTokensOptions = {}
) => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const { mainnetTokens, testnetTokens } = useRabbySelector((store) => ({
    mainnetTokens: store.account.tokens,
    testnetTokens: store.account.testnetTokens,
  }));

  const [hasValue, setHasValue] = useSafeState(false);
  const [isLoading, setLoading] = useSafeState(true);
  const [isAllTokenLoading, setIsAllTokenLoading] = useSafeState(true);

  const userAddrRef = useRef('');
  const chainIdRef = useRef<string | undefined>(undefined);

  const abortProcess = useRef<AbortController>();
  const callCountRef = useRef(0);

  const isTestnet = useMemo(() => {
    return chainServerId
      ? !!findChain({ serverId: chainServerId })?.isTestnet
      : false;
  }, [chainServerId]);

  useEffect(() => {
    if (updateNonce === 0) return;
    loadProcess();
    return () => {
      abortProcess.current?.abort();
    };
  }, [updateNonce]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (userAddr) {
      timer = setTimeout(() => {
        if (
          visible &&
          (!isSameAddress(userAddr, userAddrRef.current) ||
            chainServerId !== chainIdRef.current)
        ) {
          abortProcess.current?.abort();
          userAddrRef.current = userAddr;
          chainIdRef.current = chainServerId;
          loadProcess();
        }
      });
    } else {
      setHasValue(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }, [userAddr, visible, chainServerId]);

  const loadProcess = async ({ forceRefresh = false } = {}) => {
    callCountRef.current++;
    const callCount = callCountRef.current;
    const abortedFn = () => {
      if (callCount === callCountRef.current) {
        setLoading(false);
        setIsAllTokenLoading(false);
      }
    };

    if (!userAddr || isTestnet) {
      return;
    }

    if (!isSameAddress(userAddr, lastResetTokenListAddr)) {
      await dispatch.account.resetTokenList();
      lastResetTokenListAddr = userAddr;
    }

    const matchedAccount = await wallet.getAccountByAddress(userAddr);
    const shouldPersistTokenCache = matchedAccount
      ? isFullVersionAccountType(matchedAccount as any)
      : false;

    const currentAbort = new AbortController();
    abortProcess.current = currentAbort;

    setLoading(true);
    setIsAllTokenLoading(true);
    setHasValue(false);
    log('======Start-Tokens======', userAddr);

    const dispatchTokenList = (tokens: AbstractPortfolioToken[]) => {
      const displayTokens = filterValidChainTokens(tokens);

      if (isTestnet) {
        dispatch.account.setTestnetTokenList(displayTokens);
      } else {
        dispatch.account.setTokenList(displayTokens);
      }
    };

    const applyTokenItems = (tokens: TokenItem[]) => {
      setHasValue(tokens.length > 0);
      dispatchTokenList(sortTokenItems(tokens));
    };

    if (currentAbort.signal.aborted) {
      abortedFn();
      return;
    }

    let currentAllTokens: TokenItem[] = [];

    /**
     * 阶段一：本地 DB 缓存
     * 能用缓存就从缓存取，否则删除缓存
     */
    try {
      if (!shouldPersistTokenCache) {
        await Promise.all([
          tokenDbService.deleteForAddress(userAddr),
          syncDbService.deleteSceneForAddress({
            address: userAddr,
            scene: TOKEN_SYNC_SCENE,
          }),
        ]);
      } else {
        currentAllTokens = await tokenDbService.queryTokens(userAddr);

        if (currentAbort.signal.aborted) {
          abortedFn();
          return;
        }

        if (currentAllTokens.length) {
          applyTokenItems(currentAllTokens);
          setLoading(false);
        }

        const updatedAt =
          (await syncDbService.getUpdatedAt({
            address: userAddr,
            scene: TOKEN_SYNC_SCENE,
          })) || 0;

        const shouldUseDbCache =
          currentAllTokens.length > 0 &&
          !forceRefresh &&
          !realtimeMode &&
          updatedAt > Date.now() - CACHE_VALID_DURATION;

        if (shouldUseDbCache) {
          log('<<==Tokens-cache-hit==>>', userAddr);
          setIsAllTokenLoading(false);
          return;
        }
      }
    } catch (error) {
      // 忽略 db 的影响，直接走线上逻辑
      log('--Terminate-tokens-db-cache-get', userAddr);
    }

    /**
     * 阶段二：接口快照缓存
     * 完成后再决定是否进入完整刷新。
     */
    const snapshot = await queryTokensCache(userAddr, wallet, isTestnet);

    if (!snapshot) {
      log('--Terminate-tokens-snapshot-', userAddr);
      setLoading(false);
      setIsAllTokenLoading(false);
      return;
    }

    if (currentAbort.signal.aborted) {
      log('--Terminate-tokens-snapshot-', userAddr);
      abortedFn();
      return;
    }

    if (snapshot?.length) {
      currentAllTokens = replaceCoreTokens(currentAllTokens, snapshot);
      applyTokenItems(currentAllTokens);
      setLoading(false);
    }

    /**
     * 阶段三：完整 token 刷新
     */
    const tokenRes = await batchQueryTokens(
      userAddr,
      wallet,
      chainServerId,
      isTestnet
    );

    if (!tokenRes) {
      log('--Terminate-tokens- no tokenRes', userAddr);
      setLoading(false);
      setIsAllTokenLoading(false);
      return;
    }

    if (currentAbort.signal.aborted) {
      log('--Terminate-tokens-', userAddr);
      abortedFn();
      return;
    }

    currentAllTokens = replaceTokensWithLatest(
      currentAllTokens,
      tokenRes,
      chainServerId
    );

    if (shouldPersistTokenCache) {
      try {
        await tokenDbService.replaceAddressTokens(userAddr, currentAllTokens);

        if (!chainServerId) {
          await syncDbService.setUpdatedAt({
            address: userAddr,
            scene: TOKEN_SYNC_SCENE,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        // 忽略 db 的影响，不写缓存，直走内存
        log('--Terminate-tokens-db-cache-set', userAddr);
      }
    }

    applyTokenItems(tokenRes);

    setLoading(false);
    setIsAllTokenLoading(false);

    log('<<==Tokens-end==>>', userAddr);
  };

  useEffect(() => {
    return () => {
      abortProcess.current?.abort();
    };
  }, []);

  const shouldLoadRecommended = useMemo(() => {
    if (
      !userAddr ||
      lpTokensOnly ||
      searchMode ||
      isLoading ||
      isTestnet ||
      !visible ||
      !!mainnetTokens.list.length ||
      disableRecommended
    ) {
      return false;
    }
    const currentChainTokenLength = mainnetTokens.list.filter(
      (token) => token.chain === chainServerId
    ).length;
    return currentChainTokenLength === 0;
  }, [
    userAddr,
    lpTokensOnly,
    searchMode,
    isLoading,
    isTestnet,
    visible,
    mainnetTokens.list,
    chainServerId,
  ]);

  const {
    value: recommendedTokens,
    loading: loadingRecommendedTokens,
  } = useAsync(async () => {
    if (!shouldLoadRecommended || !userAddr) {
      return [];
    }
    const list = await wallet.openapi.getSwapTokenList(
      userAddr,
      chainServerId || ''
    );

    return list.map(parseTokenItem);
  }, [shouldLoadRecommended, userAddr, chainServerId]);

  const tokens = useMemo(() => {
    const list = isTestnet
      ? testnetTokens.list
      : [...mainnetTokens.list, ...(recommendedTokens || [])];
    if (searchMode) {
      return list.filter(includeLpTokensFilter);
    }
    if (lpTokensOnly) {
      return list.filter(isLpToken);
    }
    return list.filter(defaultTokenFilter);
  }, [
    isTestnet,
    testnetTokens.list,
    mainnetTokens.list,
    recommendedTokens,
    searchMode,
    lpTokensOnly,
  ]);

  const forceRefresh = useCallback(() => {
    loadProcess({ forceRefresh: true });
  }, [loadProcess]);

  return {
    isLoading: isLoading || loadingRecommendedTokens,
    isAllTokenLoading: isAllTokenLoading || loadingRecommendedTokens,
    tokens,
    hasValue,
    updateData: forceRefresh,
  };
};
