import { useCallback, useEffect, useMemo, useRef } from 'react';

import produce from 'immer';
import { uniqBy } from 'lodash';
import { useAsync } from 'react-use';

import { isFullVersionAccountType } from '@/utils/account';
import { syncDbService } from '@/db/services/syncDbService';
import { useRabbyDispatch, useRabbySelector } from 'ui/store';
import { tokenDbService } from '@/db/services/tokenDbService';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { CACHE_VALID_DURATION, TOKEN_SYNC_SCENE } from '@/db/constants';
import { findChain, findChainByEnum } from '@/utils/chain';

import { isSameAddress } from '..';
import { log } from './usePortfolio';
import { DisplayedToken } from './project';
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
  setWalletTokens,
  sortWalletTokens,
  walletProject,
} from './tokenUtils';

let lastResetTokenListAddr = '';

const buildTokenKey = (token: Pick<TokenItem, 'chain' | 'id'>) =>
  `${token.chain}-${token.id.toLowerCase()}`;

const uniqTokens = (tokens: TokenItem[]) => {
  return uniqBy(tokens, buildTokenKey);
};

// 过滤掉无效的链
const filterValidChainTokens = (tokens: AbstractPortfolioToken[]) => {
  return tokens.filter((token) => {
    const chain = findChain({
      serverId: token.chain,
    });
    return findChainByEnum(chain?.enum);
  });
};

/** 替换核心 token */
const replaceCoreTokens = (tokens: TokenItem[], cacheTokens: TokenItem[]) => {
  return uniqTokens([
    ...tokens.filter((token) => !token.is_core),
    ...cacheTokens,
  ]);
};

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

  const [data, setData] = useSafeState(walletProject);
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
      setData(undefined);
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
    log('======Start-Tokens======', userAddr);
    let _data = produce(walletProject, (draft) => {
      draft.netWorth = 0;
      draft._netWorth = '$0';
      draft._netWorthChange = '-';
      draft.netWorthChange = 0;
      draft._netWorthChangePercent = '';
    });
    let _tokens: AbstractPortfolioToken[] = [];
    setData(_data);

    if (currentAbort.signal.aborted) {
      abortedFn();
      return;
    }

    let currentAllTokens: TokenItem[] = [];

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
        const chainTokens = currentAllTokens.reduce((m, n) => {
          m[n.chain] = m[n.chain] || [];
          m[n.chain].push(n);

          return m;
        }, {} as Record<string, TokenItem[]>);
        _data = produce(_data, (draft) => {
          setWalletTokens(draft, chainTokens);
        });

        setData(_data);
        _tokens = sortWalletTokens(_data);
        if (isTestnet) {
          dispatch.account.setTestnetTokenList(filterValidChainTokens(_tokens));
        } else {
          dispatch.account.setTokenList(filterValidChainTokens(_tokens));
        }
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
      const chainTokens = currentAllTokens.reduce((m, n) => {
        m[n.chain] = m[n.chain] || [];
        m[n.chain].push(n);

        return m;
      }, {} as Record<string, TokenItem[]>);
      _data = produce(_data, (draft) => {
        setWalletTokens(draft, chainTokens);
      });

      setData(_data);
      _tokens = sortWalletTokens(_data);
      if (isTestnet) {
        dispatch.account.setTestnetTokenList(filterValidChainTokens(_tokens));
      } else {
        dispatch.account.setTokenList(filterValidChainTokens(_tokens));
      }
      setLoading(false);
    }

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

    currentAllTokens = uniqTokens([
      ...(chainServerId
        ? currentAllTokens.filter((token) => token.chain !== chainServerId)
        : []),
      ...tokenRes,
    ]);

    if (currentAbort.signal.aborted) {
      abortedFn();
      return;
    }

    if (shouldPersistTokenCache) {
      await tokenDbService.replaceAddressTokens(userAddr, currentAllTokens);

      if (!chainServerId) {
        await syncDbService.setUpdatedAt({
          address: userAddr,
          scene: TOKEN_SYNC_SCENE,
          updatedAt: Date.now(),
        });
      }
    }

    const tokensDict: Record<string, TokenItem[]> = {};
    tokenRes.forEach((token) => {
      if (!tokensDict[token.chain]) {
        tokensDict[token.chain] = [];
      }
      tokensDict[token.chain].push(token);
    });

    _data = produce(_data, (draft) => {
      setWalletTokens(draft, tokensDict);
    });

    setData(_data);
    _tokens = sortWalletTokens(_data);
    if (isTestnet) {
      dispatch.account.setTestnetTokenList(filterValidChainTokens(_tokens));
    } else {
      dispatch.account.setTokenList(filterValidChainTokens(_tokens));
    }

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

    return list.map(
      (token) => new DisplayedToken(token) as AbstractPortfolioToken
    );
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
    hasValue: !!data?._portfolios?.length,
    updateData: forceRefresh,
  };
};
