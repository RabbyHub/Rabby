import { useRef, useEffect } from 'react';
import produce from 'immer';
import { Dayjs } from 'dayjs';
import { TokenItem } from '@debank/rabby-api/dist/types';

import { useWallet } from '../WalletContext';
import { useSafeState } from '../safeState';
import { log } from './usePortfolio';
import {
  PortfolioItem,
  PortfolioItemToken,
} from '@debank/rabby-api/dist/types';
import { AbstractPortfolioToken } from './types';
import { getMissedTokenPrice } from './utils';
import {
  walletProject,
  batchQueryTokens,
  batchQueryHistoryTokens,
  setWalletTokens,
  queryTokensCache,
  sortWalletTokens,
} from '../token';
import { DisplayedProject } from './project';

// export const tokenChangeLoadingAtom = atom(false);

export const useTokens = (userAddr: string | undefined, timeAt?: Dayjs) => {
  const abortProcess = useRef<AbortController>();
  const [data, setData] = useSafeState(walletProject);
  const [tokens, setTokens] = useSafeState<AbstractPortfolioToken[]>([]);
  const [isLoading, setLoading] = useSafeState(true);
  const historyTime = useRef<number>();
  const historyLoad = useRef<boolean>(false);
  const wallet = useWallet();
  // const setTokenChangeLoading = useSetAtom(tokenChangeLoadingAtom);

  useEffect(() => {
    if (userAddr) {
      loadProcess();
    } else {
      setData(undefined);
    }

    return () => {
      // eslint-disable-next-line
      abortProcess.current?.abort();
    };
    // eslint-disable-next-line
  }, [userAddr]);

  useEffect(() => {
    if (timeAt) {
      historyTime.current = timeAt.unix();

      if (!isLoading) {
        loadHistory();
      }
    } else {
      historyTime.current = 0;
    }
    // eslint-disable-next-line
  }, [timeAt, isLoading]);

  const loadProcess = async () => {
    if (!userAddr) {
      return;
    }

    const currentAbort = new AbortController();
    abortProcess.current = currentAbort;
    historyLoad.current = false;

    // if (!userInfo) {
    //   return;
    // }
    // if (!userInfo.used_chains?.length) {
    //   setLoading(false);
    //   setData(
    //     produce(initWallet, draft => {
    //       draft._netWorth = '$0';
    //     }),
    //   );
    //   return;
    // }

    setLoading(true);
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

    const snapshot = await queryTokensCache(userAddr, wallet);

    if (snapshot?.length) {
      const chainTokens = snapshot.reduce((m, n) => {
        m[n.chain] = m[n.chain] || [];
        m[n.chain].push(n);

        return m;
      }, {} as Record<string, TokenItem[]>);
      _data = produce(_data, (draft) => {
        setWalletTokens(draft, chainTokens);
      });

      setData(_data);
      _tokens = sortWalletTokens(_data);
      setTokens(_tokens);
    }

    const tokenRes = await batchQueryTokens(userAddr, wallet);

    if (currentAbort.signal.aborted) {
      setLoading(false);
      log('======Terminate-Token======', userAddr);
      return;
    }

    if (!tokenRes || !tokenRes.length) {
      // failed request
      setLoading(false);
      return;
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
    setTokens(_tokens);
    setLoading(false);

    loadHistory(_data, currentAbort);

    log('<<==Tokens-end==>>', userAddr);
  };

  const loadHistory = async (
    pre?: DisplayedProject,
    currentAbort = new AbortController()
  ) => {
    if (!historyTime.current || !userAddr || historyLoad.current) {
      log('middle-tokens-end');
      return;
    }

    abortProcess.current = currentAbort;
    historyLoad.current = true;

    let _data = pre || data!;

    log('===token===batchhistory====', userAddr);
    // setTokenChangeLoading(true);

    if (currentAbort.signal.aborted || !_data?.netWorth) {
      setLoading(false);
      return;
    }

    const historyTokenRes = await batchQueryHistoryTokens(
      userAddr,
      historyTime.current,
      wallet
    );

    if (currentAbort.signal.aborted) {
      setLoading(false);
      return;
    }

    const historyPortfolios: PortfolioItem[] = [];

    historyTokenRes?.forEach((token) => {
      const chain = token.chain;
      const index = historyPortfolios.findIndex((p) => p.pool.id === chain);
      if (index === -1) {
        historyPortfolios.push({
          pool: {
            id: chain,
          },
          asset_token_list: [token as PortfolioItemToken],
        } as PortfolioItem);
      } else {
        historyPortfolios[index].asset_token_list?.push(
          token as PortfolioItemToken
        );
      }
    });

    _data = produce(_data, (draft) => {
      draft.patchHistory(historyPortfolios);
    });

    const tokenList = sortWalletTokens(_data);
    setTokens(tokenList);
    setData(_data);

    if (currentAbort.signal.aborted) {
      setLoading(false);
      return;
    }

    const missedTokens = tokenList.reduce((m, n) => {
      if (n._tokenId && !n._historyPatched) {
        m[n.chain] = m[n.chain] || new Set();
        m[n.chain].add(n._tokenId);
      }

      return m;
    }, {} as Record<string, Set<string>>);

    const priceDicts = await getMissedTokenPrice(
      missedTokens,
      historyTime.current,
      wallet
    );

    if (currentAbort.signal.aborted || !priceDicts) {
      setLoading(false);
      return;
    }

    _data = produce(_data, (draft) => {
      Object.entries(priceDicts).forEach(([c, dict]) => {
        if (!draft._portfolioDict[c]._historyPatched) {
          draft._portfolioDict[c].patchPrice(dict);
          if (draft._portfolioDict[c].netWorthChange) {
            draft.netWorthChange += draft._portfolioDict[c].netWorthChange;
          }
        }
        draft.afterHistoryPatched();
      });
    }) as DisplayedProject;

    if (currentAbort.signal.aborted) {
      setLoading(false);
      return;
    }

    setData(_data);
    setTokens(sortWalletTokens(_data));
  };

  useEffect(() => {
    return () => {
      abortProcess.current?.abort();
    };
  }, []);

  return {
    netWorth: data?.netWorth || 0,
    isLoading,
    tokens,
    hasValue: !!data?._portfolios?.length,
    updateData: loadProcess,
    walletProject: data,
  };
};
