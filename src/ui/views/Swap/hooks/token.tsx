import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync, useAsyncFn, useDebounce } from 'react-use';
import { QuoteProvider, TDexQuoteData, useQuoteMethods } from './quote';
import {
  useQuoteVisible,
  useRefreshId,
  useSetQuoteVisible,
  useSetRefreshId,
} from './context';
import { useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
import { useRbiSource } from '@/ui/utils/ga-event';
import stats from '@/stats';
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { findChain, findChainByEnum } from '@/utils/chain';
import { GasLevelType } from '../Component/ReserveGasPopup';
import { useSwapSlippage } from './slippage';
import { useLowCreditState } from '../Component/LowCreditModal';

const useTokenInfo = ({
  userAddress,
  chain,
  defaultToken,
}: {
  userAddress?: string;
  chain?: CHAINS_ENUM;
  defaultToken?: TokenItem;
}) => {
  const refreshId = useRefreshId();
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
  }, [refreshId, userAddress, token?.id, token?.raw_amount_hex_str, chain]);

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
      dispatch.swap.setSelectedChain(c);
    },
    [dispatch?.swap?.setSelectedChain]
  );

  const [payToken, setPayToken] = useTokenInfo({
    userAddress,
    chain,
    defaultToken: defaultSelectedFromToken || getChainDefaultToken(chain),
  });

  const [receiveToken, _setReceiveToken] = useTokenInfo({
    userAddress,
    chain,
    defaultToken: defaultSelectedToToken,
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
    expiredTimer.current = setTimeout(() => {
      setRefreshId((e) => e + 1);
    }, 1000 * 20);
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
      if (!searchObj?.chain && !searchObj.payTokenId && !initialSelectedChain) {
        switchChain(firstEnum);
      }
    },
  });

  useEffect(() => {
    dispatch.swap.setSelectedFromToken(payToken);
  }, [payToken]);

  useEffect(() => {
    dispatch.swap.setSelectedToToken(receiveToken);
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
      const wrapTokens = [
        WrapTokenAddressMap[chain],
        findChainByEnum(chain)!.nativeTokenAddress,
      ];
      const res =
        !!wrapTokens.find((token) => isSameAddress(payToken?.id, token)) &&
        !!wrapTokens.find((token) => isSameAddress(receiveToken?.id, token));
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

  useEffect(() => {
    if (isWrapToken) {
      setFeeRate('0');
    }
    if (slippageObj.autoSlippage) {
      slippageObj.setSlippage(isStableCoin ? '0.1' : '0.5');
    }
  }, [slippageObj.autoSlippage, isWrapToken, isStableCoin]);

  const [quoteList, setQuotesList] = useState<TDexQuoteData[]>([]);
  const visible = useQuoteVisible();

  useEffect(() => {
    setQuotesList([]);
  }, [payToken?.id, receiveToken?.id, chain, inputAmount, inSufficient]);

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
      !inSufficient &&
      !isDraggingSlider
    ) {
      setQuotesList((e) =>
        e.map((q) => ({ ...q, loading: true, isBest: false }))
      );
      setActiveProvider(undefined);
      return getAllQuotes({
        userAddress,
        payToken,
        receiveToken,
        slippage: slippageObj.slippage || '0.1',
        chain,
        payAmount: inputAmount,
        fee: feeRate,
        setQuote: setQuote(currentFetchId),
      }).finally(() => {
        setPending(false);
        setShowMoreVisible(true);
      });
    } else {
      setActiveProvider(undefined);
    }
  }, [
    setActiveProvider,
    inSufficient,
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
      !inSufficient
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
    inSufficient,
    slippageObj?.slippage,
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
              quote?.preExecResult.swapPreExecTx.balance_change.receive_token_list.find(
                (token) => isSameAddress(token.id, receiveToken.id)
              )?.amount || 0;

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
                  preExecResult?.swapPreExecTx.balance_change.receive_token_list.find(
                    (token) => isSameAddress(token.id, receiveToken.id)
                  )?.amount || '',
                gasUsd: preExecResult?.gasUsd,
              }
        );
      }
    }
  }, [quoteList, quoteLoading, receiveToken, inSufficient, visible]);

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
  }, [payToken?.id, receiveToken?.id, chain, inputAmount, inSufficient]);

  useEffect(() => {
    let active = true;
    if (searchObj.chain && searchObj.payTokenId) {
      const target = findChain({
        serverId: searchObj.chain,
      });
      if (target) {
        setChain(target?.enum);
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

        if (searchObj?.inputAmount && !searchObj?.isMax) {
          handleAmountChange(searchObj?.inputAmount);
        }
        if (searchObj?.receiveTokenId) {
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
