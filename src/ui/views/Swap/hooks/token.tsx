import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { getUiType, isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync, useAsyncFn, useDebounce } from 'react-use';
import {
  isSwapWrapToken,
  QuoteProvider,
  TDexQuoteData,
  useQuoteMethods,
} from './quote';
import { useRefreshId, useSetQuoteVisible, useSetRefreshId } from './context';
import { useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
import { useRbiSource } from '@/ui/utils/ga-event';
import stats from '@/stats';
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { EVENTS, SWAP_SUPPORT_CHAINS } from '@/constant';
import { findChain, findChainByEnum } from '@/utils/chain';
import { GasLevelType } from '../Component/ReserveGasPopup';
import { getSwapAutoSlippageValue, useSwapSlippage } from './slippage';
import { useLowCreditState } from '../Component/LowCreditModal';
import eventBus from '@/eventBus';
import { useAutoSlippageEffect } from './autoSlippageEffect';
import { useClearMiniGasStateEffect } from '@/ui/hooks/miniSignGasStore';
const isTab = getUiType().isTab;

export const enableInsufficientQuote = true;

const useTokenInfo = ({
  userAddress,
  chain,
  defaultToken,
  refreshTokenId,
}: {
  userAddress?: string;
  chain?: CHAINS_ENUM;
  defaultToken?: TokenItem;
  refreshTokenId?: number;
}) => {
  const wallet = useWallet();
  const [token, setToken] = useState<TokenItem | undefined>(defaultToken);

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
    userAddress,
    token?.id,
    token?.raw_amount_hex_str,
    chain,
    refreshTokenId,
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

  if (error) {
    console.error('token info error', chain, token?.symbol, token?.id, error);
  }
  return [token, setToken] as const;
};

export interface FeeProps {
  fee: '0.25' | '0';
  symbol?: string;
}

export const useTokenPair = (userAddress: string) => {
  const dispatch = useRabbyDispatch();
  const refreshId = useRefreshId();
  const setRefreshId = useSetRefreshId();
  const wallet = useWallet();

  const {
    initialSelectedChain,
    oChain,
    defaultSelectedFromToken,
    defaultSelectedToToken,
  } = useRabbySelector((state) => {
    return {
      initialSelectedChain: state.swap.$$initialSelectedChain,
      oChain: state.swap.selectedChain || CHAINS_ENUM.ETH,
      defaultSelectedFromToken: state.swap.selectedFromToken,
      defaultSelectedToToken:
        state.swap.selectedToToken?.id !== state.swap.selectedFromToken?.id
          ? state.swap.selectedToToken
          : undefined,
    };
  });

  const [chain, setChain] = useState(oChain);

  const handleChain = useCallback(
    (c: CHAINS_ENUM) => {
      setChain(c);
      if (!isTab) {
        dispatch.swap.setSelectedChain(c);
      }
    },
    [dispatch?.swap?.setSelectedChain]
  );
  const [refreshTokenId, updateRefreshTokenId] = useState(0);
  const refreshTokensInfo = useCallback(
    () => updateRefreshTokenId((e) => e + 1),
    [updateRefreshTokenId]
  );
  useEffect(() => {
    const refreshToken = (params: { addressList: string[] }) => {
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
  }, [refreshTokensInfo, userAddress]);

  const [payToken, setPayToken] = useTokenInfo({
    userAddress,
    chain,
    defaultToken: defaultSelectedFromToken || getChainDefaultToken(chain),
    refreshTokenId,
  });

  const [receiveToken, _setReceiveToken] = useTokenInfo({
    userAddress,
    chain,
    defaultToken: defaultSelectedToToken,
    refreshTokenId,
  });

  const {
    lowCreditToken,
    lowCreditVisible,
    setLowCreditToken,
    setLowCreditVisible,
  } = useLowCreditState(receiveToken);

  const setReceiveToken = useCallback(
    (token?: TokenItem) => {
      _setReceiveToken(token);
      if (token) {
        if (token?.low_credit_score) {
          setLowCreditToken(token);
          setLowCreditVisible(true);
        }
      }
    },
    [_setReceiveToken]
  );

  const [bestQuoteDex, setBestQuoteDex] = useState<string>('');

  const setActiveProvider: React.Dispatch<
    React.SetStateAction<QuoteProvider | undefined>
  > = useCallback((p) => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }

    if (p) {
      expiredTimer.current = setTimeout(() => {
        setRefreshId((e) => e + 1);
      }, 1000 * 20);
    }

    setOriActiveProvider(p);
  }, []);

  const switchChain = useCallback(
    (c: CHAINS_ENUM, opts?: { payTokenId?: string; changeTo?: boolean }) => {
      handleChain(c);
      if (!opts?.changeTo) {
        setPayToken({
          ...getChainDefaultToken(c),
          ...(opts?.payTokenId ? { id: opts?.payTokenId } : {}),
        });
        setReceiveToken(undefined);
      } else {
        setReceiveToken({
          ...getChainDefaultToken(c),
          ...(opts?.payTokenId ? { id: opts?.payTokenId } : {}),
        });
        // setPayToken(undefined);
      }
      setPayAmount('');
      setSlider(0);
      setActiveProvider(undefined);
    },
    [setPayToken, setReceiveToken]
  );

  const { search } = useLocation();
  const [searchObj] = useState<{
    payTokenId?: string;
    chain?: string;
    inputAmount?: string;
    receiveTokenId?: string;
    isMax?: boolean;
  }>(query2obj(search));

  useAsyncInitializeChainList({
    // NOTICE: now `useTokenPair` is only used for swap page, so we can use `SWAP_SUPPORT_CHAINS` here
    supportChains: SWAP_SUPPORT_CHAINS,
    onChainInitializedAsync: (firstEnum) => {
      // only init chain if it's not cached before
      if (
        !searchObj?.chain &&
        !searchObj.payTokenId &&
        !searchObj.receiveTokenId &&
        !initialSelectedChain
      ) {
        switchChain(firstEnum);
      }
    },
  });

  useEffect(() => {
    if (!isTab) {
      dispatch.swap.setSelectedFromToken(payToken);
    }
  }, [payToken]);

  useEffect(() => {
    if (!isTab) {
      dispatch.swap.setSelectedToToken(receiveToken);
    }
  }, [receiveToken]);

  const [inputAmount, setPayAmount] = useState('');

  const [slider, setSlider] = useState<number>(0);

  const [feeRate, setFeeRate] = useState<FeeProps['fee']>('0');

  const [swapUseSlider, setSwapUseSlider] = useState<boolean>(false);

  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const onChangeSlider = useCallback(
    (v: number, syncAmount?: boolean) => {
      if (payToken) {
        setIsDraggingSlider(true);
        setSwapUseSlider(true);
        setSlider(v);

        if (syncAmount) {
          setIsDraggingSlider(false);
        }

        if (v === 100) {
          handleSlider100();
          return;
        }

        const newAmountBn = new BigNumber(v)
          .div(100)
          .times(tokenAmountBn(payToken));
        const isTooSmall = newAmountBn.lt(0.0001);
        setPayAmount(
          isTooSmall
            ? newAmountBn.toString(10)
            : new BigNumber(newAmountBn.toFixed(4, 1)).toString(10)
        );
      }
    },
    [payToken]
  );

  const slippageObj = useSwapSlippage();

  const [currentProvider, setOriActiveProvider] = useState<
    QuoteProvider | undefined
  >();

  const expiredTimer = useRef<NodeJS.Timeout>();

  const exchangeToken = useCallback(() => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
    setPayAmount('');
    setSlider(0);
  }, [setPayToken, receiveToken, setReceiveToken, payToken]);

  const payTokenIsNativeToken = useMemo(() => {
    if (payToken) {
      return isSameAddress(
        payToken.id,
        findChainByEnum(chain)!.nativeTokenAddress
      );
    }
    return false;
  }, [chain, payToken]);

  const [passGasPrice, setUseGasPrice] = useState(false);

  const handleAmountChange = useCallback(
    (v: string) => {
      if (!/^\d*(\.\d*)?$/.test(v)) {
        return;
      }
      setPayAmount(v);
      if (payToken) {
        const slider = v
          ? Number(
              new BigNumber(v || 0)
                .div(tokenAmountBn(payToken))
                .times(100)
                .toFixed(0)
            )
          : 0;
        setSlider(slider < 0 ? 0 : slider > 100 ? 100 : slider);
        if (!payToken?.amount) {
          setSlider(0);
        }
      }
      setUseGasPrice(false);
      setSwapUseSlider(false);
    },
    [payToken]
  );

  const [gasLevel, setGasLevel] = useState<GasLevelType>('normal');
  const gasPriceRef = useRef<number>();

  const { value: gasList, loading: isGasMarketLoading } = useAsync(() => {
    gasPriceRef.current = undefined;
    setGasLevel('normal');
    return wallet.gasMarketV2({ chainId: findChainByEnum(chain)!.serverId });
  }, [chain]);

  const normalGasPrice = useMemo(
    () => gasList?.find((e) => e.level === 'normal')?.price,
    [gasList]
  );

  const nativeTokenDecimals = useMemo(
    () => findChain({ enum: chain })?.nativeTokenDecimals || 1e18,
    [chain]
  );

  const gasLimit = useMemo(
    () => (chain === CHAINS_ENUM.ETH ? 1000000 : 2000000),
    [chain]
  );

  useEffect(() => {
    if (payTokenIsNativeToken && gasList) {
      const checkGasIsEnough = (price: number) => {
        return new BigNumber(payToken?.raw_amount_hex_str || 0, 16).gte(
          new BigNumber(gasLimit).times(price)
        );
      };
      const normalPrice =
        gasList?.find((e) => e.level === 'normal')?.price || 0;
      const isNormalEnough = checkGasIsEnough(normalPrice);
      if (isNormalEnough) {
        gasPriceRef.current = normalGasPrice;
      } else {
        gasPriceRef.current = undefined;
      }
    }
  }, [payTokenIsNativeToken, gasList, gasLimit, payToken?.raw_amount_hex_str]);

  const handleSlider100 = useCallback(() => {
    if (
      payTokenIsNativeToken &&
      payToken &&
      gasPriceRef.current !== undefined
    ) {
      const val = tokenAmountBn(payToken).minus(
        new BigNumber(gasLimit)
          .times(gasPriceRef.current)
          .div(10 ** nativeTokenDecimals)
      );
      if (!val.lt(0)) {
        setUseGasPrice(true);
      }
      setPayAmount(
        val.lt(0) ? tokenAmountBn(payToken).toString(10) : val.toString(10)
      );
    } else {
      if (payToken) {
        setPayAmount(tokenAmountBn(payToken).toString(10));
      }
    }
  }, [payToken, chain, nativeTokenDecimals, gasLimit, payTokenIsNativeToken]);

  const isStableCoin = useMemo(() => {
    if (payToken?.price && receiveToken?.price) {
      return new BigNumber(payToken?.price)
        .minus(receiveToken?.price)
        .div(payToken?.price)
        .abs()
        .lte(0.01);
    }
    return false;
  }, [payToken, receiveToken]);

  const [isWrapToken, wrapTokenSymbol] = useMemo(() => {
    if (payToken?.id && receiveToken?.id) {
      const res = isSwapWrapToken(payToken?.id, receiveToken?.id, chain);
      return [
        res,
        isSameAddress(payToken?.id, WrapTokenAddressMap[chain])
          ? payToken.symbol
          : receiveToken.symbol,
      ];
    }
    return [false, ''];
  }, [payToken?.id, receiveToken?.id, chain]);

  const inSufficient = useMemo(
    () =>
      payToken
        ? tokenAmountBn(payToken).lt(inputAmount)
        : new BigNumber(0).lt(inputAmount),
    [payToken, inputAmount]
  );

  const inSufficientCanGetQuote = enableInsufficientQuote
    ? true
    : !inSufficient;

  useEffect(() => {
    if (isWrapToken) {
      setFeeRate('0');
    }
    if (slippageObj.autoSlippage) {
      slippageObj.setSlippage(getSwapAutoSlippageValue(isStableCoin));
    }
  }, [slippageObj.autoSlippage, isWrapToken, isStableCoin]);

  const [quoteList, setQuotesList] = useState<TDexQuoteData[]>([]);

  useEffect(() => {
    setQuotesList([]);
  }, [payToken?.id, receiveToken?.id, chain, inputAmount]);

  useEffect(() => {
    setActiveProvider(undefined);
  }, [payToken?.id, receiveToken?.id, chain]);

  useEffect(() => {
    if (!enableInsufficientQuote || !inputAmount || Number(inputAmount) === 0) {
      setActiveProvider(undefined);
    }
  }, [inputAmount]);

  useEffect(() => {
    if (!inSufficientCanGetQuote) {
      setQuotesList([]);
      setActiveProvider(undefined);
    }
  }, [inSufficientCanGetQuote]);

  const setQuote = useCallback(
    (id: number) => (quote: TDexQuoteData) => {
      if (id === fetchIdRef.current) {
        setQuotesList((e) => {
          const index = e.findIndex((q) => q.name === quote.name);
          // setActiveProvider((activeQuote) => {
          //   if (activeQuote?.name === quote.name) {
          //     return undefined;
          //   }
          //   return activeQuote;
          // });

          const v: TDexQuoteData = { ...quote, loading: false };
          if (index === -1) {
            return [...e, v];
          }
          e[index] = v;
          return [...e];
        });
      }
    },
    []
  );

  const [showMoreVisible, setShowMoreVisible] = useState(false);

  const [pending, setPending] = useState(false);

  const [autoSuggestSlippage, setAutoSuggestSlippage] = useState(
    getSwapAutoSlippageValue(isStableCoin)
  );

  const setAutoSlippage = useCallback(() => {
    slippageObj.setAutoSlippage(true);
  }, [slippageObj.setAutoSlippage]);

  useAutoSlippageEffect({
    chainServerId: findChainByEnum(chain)?.serverId || '',
    fromTokenId: payToken?.id || '',
    toTokenId: receiveToken?.id || '',
    onSetAutoSlippage: setAutoSlippage,
  });

  useClearMiniGasStateEffect({
    chainServerId: findChainByEnum(chain)?.serverId || '',
    fromTokenId: payToken?.id || '',
    toTokenId: receiveToken?.id || '',
  });

  const fetchIdRef = useRef(0);
  const { getAllQuotes, validSlippage } = useQuoteMethods();
  const [
    { loading: quoteLoading, error: quotesError },
    getQuotes,
  ] = useAsyncFn(async () => {
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    if (
      userAddress &&
      payToken?.id &&
      receiveToken?.id &&
      receiveToken &&
      chain &&
      Number(inputAmount) > 0 &&
      feeRate &&
      inSufficientCanGetQuote &&
      !isDraggingSlider
    ) {
      refreshTokensInfo();

      setQuotesList((e) =>
        e.map((q) => ({ ...q, loading: true, isBest: false }))
      );
      let slippage = slippageObj.slippage;
      if (slippageObj.autoSlippage) {
        try {
          const suggestSlippage = await wallet.openapi.suggestSlippage({
            chain_id: findChainByEnum(chain)!.serverId,
            slippage: new BigNumber(slippageObj.slippage || '0.1')
              .div(100)
              .toFixed(),
            from_token_id: payToken.id,
            to_token_id: receiveToken.id,
            from_token_amount: inputAmount,
          });

          slippage = suggestSlippage.suggest_slippage
            ? new BigNumber(suggestSlippage.suggest_slippage)
                .times(100)
                .toFixed()
            : slippageObj.slippage || '0.1';
          if (currentFetchId === fetchIdRef.current) {
            setAutoSuggestSlippage(slippage);
          }
        } catch (error) {
          console.log('suggest_slippage error', error);
        }
      }

      return getAllQuotes({
        userAddress,
        payToken,
        receiveToken,
        slippage: slippage,
        chain,
        payAmount: inputAmount,
        fee: feeRate,
        setQuote: setQuote(currentFetchId),
        inSufficient,
      }).finally(() => {
        setPending(false);
        setShowMoreVisible(true);
      });
    } else {
      setActiveProvider(undefined);
    }
  }, [
    setActiveProvider,
    inSufficientCanGetQuote,
    setQuotesList,
    setQuote,
    refreshId,
    userAddress,
    payToken?.id,
    receiveToken?.id,
    chain,
    inputAmount,
    feeRate,
    slippageObj.slippage,
    slippageObj.autoSlippage,
    isDraggingSlider,
  ]);

  useEffect(() => {
    if (
      userAddress &&
      payToken?.id &&
      receiveToken?.id &&
      receiveToken &&
      chain &&
      Number(inputAmount) > 0 &&
      feeRate &&
      inSufficientCanGetQuote
    ) {
      setPending(true);
    } else {
      setPending(false);
    }
  }, [
    userAddress,
    payToken?.id,
    receiveToken?.id,
    chain,
    inputAmount,
    feeRate,
    inSufficientCanGetQuote,
    slippageObj?.slippage,
    slippageObj.autoSlippage,
  ]);

  useDebounce(
    () => {
      getQuotes();
    },
    1000,
    [getQuotes]
  );

  useEffect(() => {
    if (
      !quoteLoading &&
      !pending &&
      receiveToken &&
      quoteList.every((q, idx) => !q.loading)
    ) {
      const sortIncludeGasFee = true;
      const sortedList = [
        ...(quoteList?.sort((a, b) => {
          const getNumber = (quote: typeof a) => {
            const price = receiveToken.price ? receiveToken.price : 1;
            if (inSufficient) {
              return new BigNumber(quote.data?.toTokenAmount || 0)
                .div(
                  10 ** (quote.data?.toTokenDecimals || receiveToken.decimals)
                )
                .times(price);
            }
            if (!quote.preExecResult || !quote.preExecResult.isSdkPass) {
              return new BigNumber(Number.MIN_SAFE_INTEGER);
            }
            const balanceChangeReceiveTokenAmount =
              new BigNumber(quote.data?.toTokenAmount || 0)
                .div(
                  10 ** (quote?.data?.toTokenDecimals || receiveToken.decimals)
                )
                .toString() || 0;

            if (sortIncludeGasFee) {
              return new BigNumber(balanceChangeReceiveTokenAmount)
                .times(price)
                .minus(quote?.preExecResult?.gasUsdValue || 0);
            }

            return new BigNumber(balanceChangeReceiveTokenAmount).times(price);
          };
          return getNumber(b).minus(getNumber(a)).toNumber();
        }) || []),
      ];
      setActiveProvider(undefined);
      if (sortedList?.[0]) {
        const bestQuote = sortedList[0];
        const { preExecResult } = bestQuote;

        setBestQuoteDex(bestQuote.name);

        setActiveProvider((preItem) =>
          !bestQuote.preExecResult || !bestQuote.preExecResult.isSdkPass
            ? undefined
            : preItem?.manualClick
            ? preItem
            : {
                name: bestQuote.name,
                quote: bestQuote.data,
                preExecResult: bestQuote.preExecResult,
                gasPrice: preExecResult?.gasPrice,
                shouldApproveToken: !!preExecResult?.shouldApproveToken,
                shouldTwoStepApprove: !!preExecResult?.shouldTwoStepApprove,
                error: !preExecResult,
                halfBetterRate: '',
                quoteWarning: undefined,
                actualReceiveAmount:
                  new BigNumber(bestQuote.data?.toTokenAmount || 0)
                    .div(
                      10 **
                        (bestQuote?.data?.toTokenDecimals ||
                          receiveToken.decimals)
                    )
                    .toString() || '',
                gasUsd: preExecResult?.gasUsd,
              }
        );
      }
    }
  }, [
    quoteList,
    quoteLoading,
    receiveToken?.id,
    receiveToken?.chain,
    inSufficient,

    pending,
  ]);

  if (quotesError) {
    console.error('quotesError', quotesError);
  }

  const {
    value: slippageValidInfo,
    error: slippageValidError,
    loading: slippageValidLoading,
  } = useAsync(async () => {
    if (
      chain &&
      Number(slippageObj.slippage) &&
      payToken?.id &&
      receiveToken?.id
    ) {
      return validSlippage({
        chain,
        slippage: slippageObj.slippage,
        payTokenId: payToken?.id,
        receiveTokenId: receiveToken?.id,
      });
    }
  }, [slippageObj.slippage, chain, payToken?.id, receiveToken?.id, refreshId]);
  const openQuote = useSetQuoteVisible();

  const openQuotesList = useCallback(() => {
    openQuote(true);
  }, []);

  useEffect(() => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
  }, [payToken?.id, receiveToken?.id, chain, inputAmount]);

  useEffect(() => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
  }, [inSufficientCanGetQuote]);

  useEffect(() => {
    let active = true;
    if (searchObj.chain) {
      const target = findChain({
        serverId: searchObj.chain,
      });
      if (target) {
        handleChain(target?.enum);

        if (searchObj.payTokenId) {
          wallet.openapi
            .getToken(userAddress, target.serverId, searchObj.payTokenId)
            .then(
              (token) => {
                if (active) {
                  if (token) {
                    setPayToken(token);
                  } else {
                    switchChain(target.enum);
                  }
                }
              },
              () => {
                if (active) {
                  switchChain(target.enum);
                }
              }
            );
        } else {
          setPayToken(undefined);
        }

        if (searchObj?.inputAmount && !searchObj?.isMax) {
          handleAmountChange(searchObj?.inputAmount);
        }

        if (searchObj?.receiveTokenId) {
          setReceiveToken({
            ...getChainDefaultToken(target.enum),
            id: searchObj.receiveTokenId,
            logo_url: '',
            symbol: '',
            optimized_symbol: '',
          });
          wallet.openapi
            .getToken(userAddress, target.serverId, searchObj.receiveTokenId)
            .then((token) => {
              if (active) {
                setReceiveToken(token);
              }
            });
        } else {
          setReceiveToken(undefined);
        }
      }
    }
    return () => {
      active = false;
    };
  }, [
    searchObj?.chain,
    searchObj?.payTokenId,
    searchObj?.inputAmount,
    searchObj?.receiveTokenId,
    searchObj?.isMax,
  ]);

  const isSetMaxRef = useRef(false);
  useEffect(() => {
    if (isSetMaxRef.current) {
      return;
    }
    if (!isGasMarketLoading && searchObj?.isMax && payToken?.amount) {
      onChangeSlider(100, true);
      isSetMaxRef.current = true;
    }
  }, [isGasMarketLoading, searchObj?.isMax, payToken]);

  const rbiSource = useRbiSource();

  useEffect(() => {
    if (rbiSource) {
      stats.report('enterSwapDescPage', {
        refer: rbiSource,
      });
    }
  }, [rbiSource]);

  const clearExpiredTimer = useCallback(() => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearExpiredTimer();
    };
  }, []);

  return {
    bestQuoteDex,
    gasLevel,

    gasLimit,
    gasList,
    passGasPrice,

    chain,
    switchChain,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,
    exchangeToken,
    payTokenIsNativeToken,

    handleAmountChange,
    setPayAmount,
    inputAmount,

    isWrapToken,
    wrapTokenSymbol,
    inSufficient,
    inSufficientCanGetQuote,

    feeRate,

    //quote
    openQuotesList,
    quoteLoading: quoteLoading || pending,
    quoteList,
    currentProvider,
    setActiveProvider,

    slippageValidInfo,
    slippageValidLoading,

    slider,
    swapUseSlider,
    onChangeSlider,

    clearExpiredTimer,
    lowCreditToken,
    lowCreditVisible,
    setLowCreditToken,
    setLowCreditVisible,
    showMoreVisible,

    ...slippageObj,

    autoSuggestSlippage,
    setAutoSuggestSlippage,
  };
};

function getChainDefaultToken(chain: CHAINS_ENUM) {
  const chainInfo = findChainByEnum(chain)!;
  return {
    id: chainInfo.nativeTokenAddress,
    decimals: chainInfo.nativeTokenDecimals,
    logo_url: chainInfo.nativeTokenLogo,
    symbol: chainInfo.nativeTokenSymbol,
    display_symbol: chainInfo.nativeTokenSymbol,
    optimized_symbol: chainInfo.nativeTokenSymbol,
    is_core: true,
    is_verified: true,
    is_wallet: true,
    amount: 0,
    price: 0,
    name: chainInfo.nativeTokenSymbol,
    chain: chainInfo.serverId,
    time_at: 0,
  } as TokenItem;
}

function tokenAmountBn(token: TokenItem) {
  return new BigNumber(token?.raw_amount_hex_str || 0, 16).div(
    10 ** (token?.decimals || 1)
  );
}

export const useDetectLoss = ({
  receiveRawAmount: receiveAmount,
  payAmount,
  payToken,
  receiveToken,
}: {
  payAmount: string;
  receiveRawAmount: string | number;
  payToken?: TokenItem;
  receiveToken?: TokenItem;
}) => {
  return useMemo(() => {
    if (!payToken || !receiveToken) {
      return false;
    }
    const pay = new BigNumber(payAmount).times(payToken.price || 0);
    const receiveAll = new BigNumber(receiveAmount);
    const receive = receiveAll.times(receiveToken.price || 0);
    const cut = receive.minus(pay).div(pay).times(100);

    return cut.lte(-5);
  }, [payAmount, payToken?.price, receiveAmount, receiveToken?.price]);
};
