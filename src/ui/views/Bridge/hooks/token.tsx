import { CHAINS_ENUM, ETH_USDT_CONTRACT, EVENTS } from '@/constant';
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, isSameAddress, useWallet } from '@/ui/utils';
import { findChain, findChainByEnum, findChainByServerID } from '@/utils/chain';
import { BridgeQuote, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getQuoteList as getBridgeQuoteList } from '@rabby-wallet/rabby-bridge';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAsyncFn, useDebounce } from 'react-use';
import useAsync from 'react-use/lib/useAsync';
import { useRefreshId, useSetQuoteVisible, useSetRefreshId } from './context';
import { getChainDefaultToken, tokenAmountBn } from '@/ui/utils/token';
import BigNumber from 'bignumber.js';
import stats from '@/stats';
import { isNaN } from 'lodash';
import { useBridgeSlippage } from './slippage';
import { useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
import eventBus from '@/eventBus';
import { bridgeQuoteScore } from '../Component/BridgeQuoteItem';
import { useGasAccountDepositFlowActive } from '@/ui/views/GasAccount/hooks/runtime';

export const enableInsufficientQuote = true;

export interface SelectedBridgeQuote extends Omit<BridgeQuote, 'tx'> {
  shouldApproveToken?: boolean;
  shouldTwoStepApprove?: boolean;
  loading?: boolean;
  tx?: BridgeQuote['tx'];
  manualClick?: boolean;
}

export const tokenPriceImpact = (
  fromToken?: TokenItem,
  toToken?: TokenItem,
  fromAmount?: string | number,
  toAmount?: string | number
) => {
  const notReady = [fromToken, toToken, fromAmount, toAmount].some((e) =>
    isNaN(e)
  );

  if (notReady) {
    return;
  }

  const fromUsdBn = new BigNumber(fromAmount || 0).times(fromToken?.price || 0);
  const toUsdBn = new BigNumber(toAmount || 0).times(toToken?.price || 0);

  const cut = toUsdBn.minus(fromUsdBn).div(fromUsdBn).times(100);

  return {
    showLoss: cut.lte(-5),
    lossUsd: formatUsdValue(toUsdBn.minus(fromUsdBn).abs().toString()),
    diff: cut.abs().toFixed(2),
    fromUsd: formatUsdValue(fromUsdBn.toString(10)),
    toUsd: formatUsdValue(toUsdBn.toString(10)),
  };
};

const useToken = (type: 'from' | 'to', refreshTokenId: number) => {
  const userAddress = useRabbySelector(
    (s) => s.account.currentAccount?.address
  );
  const wallet = useWallet();

  const lastSelectedToken = useRabbySelector((s) =>
    type === 'from' ? s.bridge.selectedFromToken : s.bridge.selectedToToken
  );

  const dispatch = useRabbyDispatch();

  const lastChainEnum = useMemo(
    () =>
      lastSelectedToken
        ? findChainByServerID(lastSelectedToken?.chain)?.enum
        : undefined,
    [lastSelectedToken?.chain]
  );
  const [chain, setChain] = useState<CHAINS_ENUM | undefined>(lastChainEnum);

  const [token, setToken] = useState<TokenItem | undefined>(lastSelectedToken);

  useEffect(() => {
    if (type === 'from') {
      dispatch.bridge.setSelectedFromToken(token);
    } else {
      dispatch.bridge.setSelectedToToken(token);
    }
  }, [token]);

  const switchChain: (
    changeChain?: CHAINS_ENUM,
    resetToken?: boolean
  ) => void = useCallback(
    (changeChain?: CHAINS_ENUM, resetToken = true) => {
      setChain(changeChain);
      if (resetToken) {
        if (type === 'from') {
          setToken(changeChain ? getChainDefaultToken(changeChain) : undefined);
        } else {
          setToken(undefined);
        }
      }
    },
    [type]
  );

  const { value, loading, error } = useAsync(async () => {
    if (userAddress && token?.id && chain) {
      const data = await wallet.openapi.getToken(
        userAddress,
        findChainByEnum(chain)!.serverId,
        token.id
      );
      return data;
    }
  }, [
    refreshTokenId,
    userAddress,
    token?.id,
    token?.raw_amount_hex_str,
    chain,
  ]);

  useDebounce(
    () => {
      if (value && !error && !loading) {
        setToken(value);
      }
    },
    300,
    [value, error, loading]
  );

  return [chain, token, setToken, switchChain] as const;
};

export const useBridge = () => {
  const userAddress = useRabbySelector(
    (s) => s.account.currentAccount?.address
  );
  const depositFlowActive = useGasAccountDepositFlowActive();

  const refreshId = useRefreshId();

  const setRefreshId = useSetRefreshId();

  const [refreshTokenId, updateRefreshTokenId] = useState(0);
  const reloadTxRefreshPausedRef = useRef(false);
  const setReloadTxRefreshPaused = useCallback((paused: boolean) => {
    reloadTxRefreshPausedRef.current = paused;
  }, []);

  const refreshTokensInfo = useCallback(
    () => updateRefreshTokenId((e) => e + 1),
    [updateRefreshTokenId]
  );
  useEffect(() => {
    const refreshToken = (params: { addressList: string[] }) => {
      if (depositFlowActive || reloadTxRefreshPausedRef.current) {
        return;
      }
      if (
        userAddress &&
        params?.addressList?.find((item) => {
          return isSameAddress(item || '', userAddress || '');
        })
      ) {
        refreshTokensInfo();
      }
    };

    eventBus.addEventListener(EVENTS.RELOAD_TX, refreshToken);
    return () => {
      eventBus.removeEventListener(EVENTS.RELOAD_TX, refreshToken);
    };
  }, [depositFlowActive, refreshTokensInfo, userAddress]);

  const wallet = useWallet();
  const [fromChain, fromToken, setFromToken, switchFromChain] = useToken(
    'from',
    refreshTokenId
  );
  const [toChain, toToken, setToToken, switchToChain] = useToken(
    'to',
    refreshTokenId
  );

  const [amount, setAmount] = useState('');

  const [maxNativeTokenGasPrice, setMaxNativeTokenGasPrice] = useState<
    number | undefined
  >(undefined);

  const slippageObj = useBridgeSlippage();

  const [recommendFromToken, setRecommendFromToken] = useState<TokenItem>();

  const fillRecommendFromToken = useCallback(() => {
    if (recommendFromToken) {
      const targetChain = findChainByServerID(recommendFromToken?.chain);
      if (targetChain) {
        switchFromChain(targetChain.enum, false);
        setFromToken(recommendFromToken);
        setAmount('');
      }
    }
  }, [recommendFromToken, switchFromChain, setFromToken]);

  const [selectedBridgeQuote, setOriSelectedBridgeQuote] = useState<
    SelectedBridgeQuote | undefined
  >();

  const expiredTimer = useRef<NodeJS.Timeout>();
  const depositFlowActiveRef = useRef(depositFlowActive);
  const previousDepositFlowActiveRef = useRef(depositFlowActive);

  useEffect(() => {
    depositFlowActiveRef.current = depositFlowActive;
  }, [depositFlowActive]);

  const inSufficient = useMemo(
    () =>
      fromToken
        ? tokenAmountBn(fromToken).lt(amount)
        : new BigNumber(0).lt(amount),
    [fromToken, amount]
  );

  const inSufficientCanGetQuote = enableInsufficientQuote
    ? true
    : !inSufficient;

  const getRecommendToChain = async (chain: CHAINS_ENUM) => {
    const useRemoteRecommendChain = async () => {
      const data = await wallet.openapi.getRecommendBridgeToChain({
        from_chain_id: findChainByEnum(chain)!.serverId,
      });
      switchToChain(findChainByServerID(data.to_chain_id)?.enum);
    };
    if (userAddress) {
      const latestTx = await wallet.openapi.getBridgeHistoryList({
        user_addr: userAddress,
        start: 0,
        limit: 1,
        is_all: true,
      });
      const latestToToken = latestTx?.history_list?.[0]?.to_token;
      if (latestToToken) {
        const lastBridgeChain = findChainByServerID(latestToToken.chain);
        if (lastBridgeChain && lastBridgeChain.enum !== chain) {
          switchToChain(lastBridgeChain.enum);
          setToToken(latestToToken);
        } else {
          await useRemoteRecommendChain();
        }
      } else {
        await useRemoteRecommendChain();
      }
    }
  };

  const {
    value: isSameToken,
    loading: isSameTokenLoading,
  } = useAsync(async () => {
    if (fromChain && fromToken?.id && toChain && toToken?.id) {
      try {
        const data = await wallet.openapi.isSameBridgeToken({
          from_chain_id: findChainByEnum(fromChain)!.serverId,
          from_token_id: fromToken?.id,
          to_chain_id: findChainByEnum(toChain)!.serverId,
          to_token_id: toToken?.id,
        });
        return data?.every((e) => e.is_same);
      } catch (error) {
        return false;
      }
    }
    return false;
  }, [fromChain, fromToken?.id, toChain, toToken?.id]);

  useEffect(() => {
    if (!isSameTokenLoading && slippageObj.autoSlippage) {
      slippageObj.setSlippage(isSameToken ? '0.5' : '1');
    }
  }, [
    slippageObj?.autoSlippage,
    slippageObj?.setSlippage,
    isSameToken,
    isSameTokenLoading,
  ]);

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);
  // the most worth chain is the first
  useAsyncInitializeChainList({
    supportChains: supportedChains,
    onChainInitializedAsync: (firstEnum) => {
      if (!(searchObj?.fromChain && searchObj?.fromTokenId) && !fromToken) {
        switchFromChain(firstEnum);
      }
      if (!(searchObj?.toTokenId && searchObj.toChain) && !toToken) {
        getRecommendToChain(firstEnum);
      }
    },
  });

  const handleAmountChange = useCallback((v: string) => {
    if (!/^\d*(\.\d*)?$/.test(v)) {
      return;
    }
    setAmount(v);
  }, []);

  const switchToken = useCallback(() => {
    switchFromChain(toChain, false);
    switchToChain(fromChain, false);
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
  }, [
    setFromToken,
    toToken,
    setToToken,
    fromToken,
    switchFromChain,
    toChain,
    switchToChain,
    fromChain,
  ]);

  const aggregatorsList = useRabbySelector(
    (s) => s.bridge.aggregatorsList || []
  );
  const canRunQuoteRequest = !!(
    inSufficientCanGetQuote &&
    userAddress &&
    fromToken?.id &&
    toToken?.id &&
    fromChain &&
    toChain &&
    Number(amount) > 0 &&
    aggregatorsList.length > 0
  );
  const [quoteList, setQuotesList] = useState<SelectedBridgeQuote[]>([]);
  const fetchIdRef = useRef(0);
  const [pending, setPending] = useState(false);

  const setSelectedBridgeQuote = useCallback((quote?: SelectedBridgeQuote) => {
    if (!quote?.manualClick && expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
    if (!quote?.manualClick && quote && !depositFlowActiveRef.current) {
      expiredTimer.current = setTimeout(() => {
        if (!depositFlowActiveRef.current) {
          setRefreshId((e) => e + 1);
        }
      }, 1000 * 30);
    }
    setOriSelectedBridgeQuote(quote);
  }, []);

  useLayoutEffect(() => {
    fetchIdRef.current += 1;
    setQuotesList([]);
    setRecommendFromToken(undefined);
    setSelectedBridgeQuote(undefined);
    setPending(canRunQuoteRequest);
  }, [
    canRunQuoteRequest,
    userAddress,
    fromToken?.id,
    toToken?.id,
    fromChain,
    toChain,
    amount,
    slippageObj.slippage,
  ]);

  const [
    { loading: quoteLoading, error: quotesError },
    getQuoteList,
  ] = useAsyncFn(async () => {
    if (depositFlowActiveRef.current) {
      setPending(false);
      return;
    }

    fetchIdRef.current += 1;
    if (canRunQuoteRequest && toToken) {
      refreshTokensInfo();
      const currentFetchId = fetchIdRef.current;

      let isEmpty = false;
      const result: SelectedBridgeQuote[] = [];

      setQuotesList((e) => {
        if (!e.length) {
          isEmpty = true;
        }
        return e?.map((e) => ({ ...e, loading: true }));
      });

      const originData: Omit<BridgeQuote, 'tx'>[] = [];

      const getQUoteV2 = async (alternativeToken?: TokenItem) =>
        await Promise.allSettled(
          aggregatorsList.map(async (bridgeAggregator) => {
            const data = await getBridgeQuoteList(
              bridgeAggregator.id,
              {
                userAddress,
                fromChainId: alternativeToken?.chain || fromToken.chain,
                fromTokenId: alternativeToken?.id || fromToken.id,
                fromTokenRawAmount: alternativeToken
                  ? new BigNumber(amount)
                      .times(fromToken.price)
                      .div(alternativeToken.price)
                      .times(10 ** alternativeToken.decimals)
                      .toFixed(0, 1)
                      .toString()
                  : new BigNumber(amount)
                      .times(10 ** fromToken.decimals)
                      .toFixed(0, 1)
                      .toString(),
                toChainId: toToken.chain,
                toTokenId: toToken.id,
                slippage: new BigNumber(slippageObj.slippageState)
                  .div(100)
                  .toString(10),
              },
              wallet.openapi
            ).catch((e) => {
              console.error(e);
              if (currentFetchId === fetchIdRef.current && !alternativeToken) {
                stats.report('bridgeQuoteResult', {
                  aggregatorIds: bridgeAggregator.id,
                  fromChainId: fromToken.chain,
                  fromTokenId: fromToken.id,
                  toTokenId: toToken.id,
                  toChainId: toToken.chain,
                  status: 'fail',
                });
              }
            });
            if (alternativeToken) {
              if (data?.length && currentFetchId === fetchIdRef.current) {
                setRecommendFromToken(alternativeToken);
                return;
              }
            }
            if (data?.length && currentFetchId === fetchIdRef.current) {
              originData.push(...data);
            }
            if (currentFetchId === fetchIdRef.current) {
              stats.report('bridgeQuoteResult', {
                aggregatorIds: bridgeAggregator.id,
                fromChainId: fromToken.chain,
                fromTokenId: fromToken.id,
                toTokenId: toToken.id,
                toChainId: toToken.chain,
                status: data?.length ? 'success' : 'none',
              });
            }
            return data;
          })
        );

      await getQUoteV2();

      const data = originData?.filter(
        (quote) =>
          !!quote?.bridge &&
          !!quote?.bridge?.id &&
          !!quote?.bridge?.logo_url &&
          !!quote.bridge.name
      );

      if (currentFetchId === fetchIdRef.current) {
        setPending(false);

        if (data.length < 1) {
          try {
            const recommendFromToken = await wallet.openapi.getRecommendFromToken(
              {
                user_addr: userAddress,
                from_chain_id: fromToken.chain,
                from_token_id: fromToken.id,
                from_token_amount: new BigNumber(amount)
                  .times(10 ** fromToken.decimals)
                  .toFixed(0, 1)
                  .toString(),
                to_chain_id: toToken.chain,
                to_token_id: toToken.id,
              }
            );
            if (currentFetchId !== fetchIdRef.current) {
              return;
            }
            if (recommendFromToken?.token_list?.[0]) {
              await getQUoteV2(recommendFromToken?.token_list?.[0]);
            } else {
              setRecommendFromToken(undefined);
            }
          } catch (error) {
            if (currentFetchId === fetchIdRef.current) {
              setRecommendFromToken(undefined);
            }
          }

          if (currentFetchId !== fetchIdRef.current) {
            return;
          }

          setSelectedBridgeQuote(undefined);
        }

        stats.report('bridgeQuoteResult', {
          aggregatorIds: aggregatorsList.map((e) => e.id).join(','),
          fromChainId: fromToken.chain,
          fromTokenId: fromToken.id,
          toTokenId: toToken.id,
          toChainId: toToken.chain,
          status: data ? (data?.length === 0 ? 'none' : 'success') : 'fail',
        });
      }

      if (data && currentFetchId === fetchIdRef.current) {
        if (!isEmpty) {
          setQuotesList(data.map((e) => ({ ...e, loading: true })));
        }

        await Promise.allSettled(
          data.map(async (quote) => {
            if (currentFetchId !== fetchIdRef.current) {
              return;
            }
            let tokenApproved = false;
            let allowance = '0';
            const fromChain = findChain({ serverId: fromToken?.chain });
            if (fromToken?.id === fromChain?.nativeTokenAddress) {
              tokenApproved = true;
            } else if (!quote.approve_contract_id) {
              tokenApproved = true;
            } else {
              allowance = await wallet.getERC20Allowance(
                fromToken.chain,
                fromToken.id,
                quote.approve_contract_id
              );
              tokenApproved = new BigNumber(allowance).gte(
                new BigNumber(amount).times(10 ** fromToken.decimals)
              );
            }
            let shouldTwoStepApprove = false;
            if (
              fromChain?.enum === CHAINS_ENUM.ETH &&
              isSameAddress(fromToken.id, ETH_USDT_CONTRACT) &&
              Number(allowance) !== 0 &&
              !tokenApproved
            ) {
              shouldTwoStepApprove = true;
            }

            if (isEmpty) {
              result.push({
                ...quote,
                shouldTwoStepApprove,
                shouldApproveToken: !tokenApproved,
              });
            } else {
              if (currentFetchId === fetchIdRef.current) {
                setQuotesList((e) => {
                  const filteredArr = e.filter(
                    (item) =>
                      item.aggregator.id !== quote.aggregator.id ||
                      item.bridge.id !== quote.bridge.id
                  );
                  return [
                    ...filteredArr,
                    {
                      ...quote,
                      loading: false,
                      shouldTwoStepApprove,
                      shouldApproveToken: !tokenApproved,
                    },
                  ];
                });
              }
            }
          })
        );

        if (isEmpty && currentFetchId === fetchIdRef.current) {
          setQuotesList(result);
        }
      }
    }
  }, [
    canRunQuoteRequest,
    aggregatorsList,
    refreshId,
    userAddress,
    fromToken?.id,
    toToken?.id,
    fromChain,
    toChain,
    amount,
    slippageObj.slippage,
  ]);

  useEffect(() => {
    if (canRunQuoteRequest) {
      setPending(true);
    } else {
      setPending(false);
    }
  }, [canRunQuoteRequest, slippageObj.slippage, refreshId]);

  const [, cancelDebounce] = useDebounce(
    () => {
      getQuoteList();
    },
    300,
    [getQuoteList]
  );

  useEffect(() => {
    if (depositFlowActive) {
      if (expiredTimer.current) {
        clearTimeout(expiredTimer.current);
      }
      setPending(false);
      cancelDebounce();
    } else if (previousDepositFlowActiveRef.current) {
      setRefreshId((e) => e + 1);
    }

    previousDepositFlowActiveRef.current = depositFlowActive;
  }, [cancelDebounce, depositFlowActive, setRefreshId]);

  const [bestQuoteId, setBestQuoteId] = useState<
    | {
        bridgeId: string;
        aggregatorId: string;
      }
    | undefined
  >(undefined);

  const openQuote = useSetQuoteVisible();

  const openQuotesList = useCallback(() => {
    openQuote(true);
  }, []);

  useEffect(() => {
    if (
      canRunQuoteRequest &&
      !quoteLoading &&
      toToken &&
      quoteList.every((e) => !e.loading)
    ) {
      if (!quoteList.length) {
        return;
      }

      let bestQuote = quoteList[0];
      let bestScore = bridgeQuoteScore(quoteList[0], toToken);
      for (let i = 1; i < quoteList.length; i += 1) {
        const score = bridgeQuoteScore(quoteList[i], toToken);
        if (score.gt(bestScore)) {
          bestScore = score;
          bestQuote = quoteList[i];
        }
      }

      if (bestQuote?.bridge_id && bestQuote?.aggregator?.id) {
        setBestQuoteId({
          bridgeId: bestQuote.bridge_id,
          aggregatorId: bestQuote.aggregator.id,
        });

        let useQuote = bestQuote;

        setOriSelectedBridgeQuote((preItem) => {
          useQuote = preItem?.manualClick ? preItem : bestQuote;
          return preItem;
        });

        setSelectedBridgeQuote(useQuote);
      }
    }
  }, [canRunQuoteRequest, quoteList, quoteLoading, toToken]);

  if (quotesError) {
    console.error('quotesError', quotesError);
  }

  const showLoss = useMemo(() => {
    if (selectedBridgeQuote) {
      return !!tokenPriceImpact(
        fromToken,
        toToken,
        amount,
        selectedBridgeQuote?.to_token_amount
      )?.showLoss;
    }
    return false;
  }, [fromToken, toToken, amount, selectedBridgeQuote]);

  const clearExpiredTimer = useCallback(() => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
  }, []);

  const { search } = useLocation();
  const [searchObj] = useState<{
    fromChain?: CHAINS_ENUM;
    fromChainServerId?: string;
    fromTokenId?: string;
    inputAmount?: string;
    toChainServerId?: string;
    toChain?: CHAINS_ENUM;
    toTokenId?: string;
    maxNativeTokenGasPrice?: string;

    chain?: string; // for from swap switch to bridge use from token
    payTokenId?: string; // for from swap switch to bridge
  }>(query2obj(search));

  useEffect(() => {
    let active = true;
    if (!searchObj) {
      return;
    }
    const fromChainServerId = searchObj.fromChainServerId || searchObj.chain;
    const fromTokenId = searchObj.fromTokenId || searchObj.payTokenId;

    if ((searchObj.fromChain || fromChainServerId) && fromTokenId) {
      const fromChainItem = findChain({
        enum: searchObj.fromChain,
        serverId: fromChainServerId,
      });
      if (userAddress && fromChainItem) {
        wallet.openapi
          .getToken(userAddress, fromChainItem.serverId, fromTokenId)
          .then((token) => {
            if (active) {
              switchFromChain(fromChainItem.enum);
              setFromToken(token);
            }
          });
      }
      if (searchObj.inputAmount) {
        handleAmountChange(searchObj.inputAmount);
      }
    }
    if (
      (searchObj.toChain || searchObj.toChainServerId) &&
      searchObj.toTokenId
    ) {
      const toChain = findChain({
        enum: searchObj.toChain,
        serverId: searchObj.toChainServerId,
      });
      if (userAddress && toChain) {
        wallet.openapi
          .getToken(userAddress, toChain.serverId, searchObj.toTokenId)
          .then((token) => {
            if (active) {
              switchToChain(toChain.enum);
              setToToken(token);
            }
          });
      }
    }

    return () => {
      active = false;
    };
  }, [
    searchObj?.fromChain,
    searchObj?.fromTokenId,
    searchObj?.inputAmount,
    searchObj?.toChain,
    searchObj?.toTokenId,
    searchObj?.chain,
    searchObj?.payTokenId,
  ]);

  const isSetMaxRef = useRef(false);
  useEffect(() => {
    if (isSetMaxRef.current) {
      return;
    }
    if (amount === searchObj?.inputAmount && searchObj.maxNativeTokenGasPrice) {
      setMaxNativeTokenGasPrice(+searchObj.maxNativeTokenGasPrice || undefined);
      isSetMaxRef.current = true;
    }
  }, [amount, searchObj.inputAmount, searchObj.maxNativeTokenGasPrice]);

  return {
    setReloadTxRefreshPaused,
    clearExpiredTimer,

    fromChain,
    fromToken,
    setFromToken,
    switchFromChain,
    toChain,
    toToken,
    setToToken,
    switchToChain,
    switchToken,

    recommendFromToken,
    fillRecommendFromToken,

    inSufficient,
    inSufficientCanGetQuote,
    amount,
    handleAmountChange,
    showLoss,

    openQuotesList,
    quoteLoading: pending || quoteLoading,
    setQuotesList,
    quoteList,

    bestQuoteId,
    selectedBridgeQuote,

    setSelectedBridgeQuote,

    maxNativeTokenGasPrice,
    setMaxNativeTokenGasPrice,

    ...slippageObj,
  };
};
