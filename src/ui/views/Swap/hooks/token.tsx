import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { GasLevel, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync, useDebounce } from 'react-use';
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
import { findChain } from '@/utils/chain';
import { GasLevelType } from '../Component/ReserveGasPopup';
import useDebounceValue from '@/ui/hooks/useDebounceValue';

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
        CHAINS[chain].serverId,
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

export const useSlippage = () => {
  const previousSlippage = useRabbySelector((s) => s.swap.slippage || '');
  const [slippageState, setSlippageState] = useState(previousSlippage || '0.1');

  const setSlippageOnStore = useRabbyDispatch().swap.setSlippage;

  const slippage = useMemo(() => slippageState || '0.1', [slippageState]);
  const [slippageChanged, setSlippageChanged] = useState(false);

  const setSlippage = useCallback(
    (slippage: string) => {
      setSlippageOnStore(slippage);
      setSlippageState(slippage);
    },
    [setSlippageOnStore]
  );

  return {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,
  };
};

export const useSlippageStore = () => {
  const { autoSlippage, isCustomSlippage } = useRabbySelector((store) => ({
    autoSlippage: store.swap.autoSlippage,
    isCustomSlippage: !!store.swap.isCustomSlippage,
  }));

  const dispatch = useRabbyDispatch();

  const setAutoSlippage = useCallback(
    (bool: boolean) => {
      dispatch.swap.setAutoSlippage(bool);
    },
    [dispatch]
  );

  const setIsCustomSlippage = useCallback(
    (bool: boolean) => {
      dispatch.swap.setIsCustomSlippage(bool);
    },
    [dispatch]
  );

  return {
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,
  };
};

export interface FeeProps {
  fee: '0.25' | '0';
  symbol?: string;
}

export const useTokenPair = (userAddress: string) => {
  const dispatch = useRabbyDispatch();
  const refreshId = useRefreshId();

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
      defaultSelectedToToken: state.swap.selectedToToken,
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

  const [receiveToken, setReceiveToken] = useTokenInfo({
    userAddress,
    chain,
    defaultToken: defaultSelectedToToken,
  });

  const [bestQuoteDex, setBestQuoteDex] = useState<string>('');

  const setActiveProvider: React.Dispatch<
    React.SetStateAction<QuoteProvider | undefined>
  > = useCallback((p) => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
    setSlippageChanged(false);
    setExpired(false);
    expiredTimer.current = setTimeout(() => {
      setExpired(true);
    }, 1000 * 30);
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
      setActiveProvider(undefined);
    },
    [setPayToken, setReceiveToken]
  );

  const { search } = useLocation();
  const [searchObj] = useState<{
    payTokenId?: string;
    chain?: string;
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
  const debouncePayAmount = useDebounceValue(inputAmount, 300);

  const [feeRate, setFeeRate] = useState<FeeProps['fee']>('0');

  const {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,
  } = useSlippage();

  const { autoSlippage } = useSlippageStore();

  const [currentProvider, setOriActiveProvider] = useState<
    QuoteProvider | undefined
  >();

  const expiredTimer = useRef<NodeJS.Timeout>();
  const [expired, setExpired] = useState(false);

  const exchangeToken = useCallback(() => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
  }, [setPayToken, receiveToken, setReceiveToken, payToken]);

  const payTokenIsNativeToken = useMemo(() => {
    if (payToken) {
      return isSameAddress(payToken.id, CHAINS[chain].nativeTokenAddress);
    }
    return false;
  }, [chain, payToken]);

  const handleAmountChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const v = e.target.value;
      if (!/^\d*(\.\d*)?$/.test(v)) {
        return;
      }
      setPayAmount(v);
    },
    []
  );

  const [gasLevel, setGasLevel] = useState<GasLevelType>('normal');
  const gasPriceRef = useRef<number>();

  const { value: gasList } = useAsync(() => {
    gasPriceRef.current = undefined;
    setGasLevel('normal');
    return wallet.openapi.gasMarket(CHAINS[chain].serverId);
  }, [chain]);

  const [reserveGasOpen, setReserveGasOpen] = useState(false);

  const normalGasPrice = useMemo(
    () => gasList?.find((e) => e.level === 'normal')?.price,
    [gasList]
  );

  const nativeTokenDecimals = useMemo(
    () => findChain({ enum: chain })?.nativeTokenDecimals || 1e18,
    [CHAINS?.[chain]]
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
      const slowPrice = gasList?.find((e) => e.level === 'slow')?.price || 0;
      const isNormalEnough = checkGasIsEnough(normalPrice);
      const isSlowEnough = checkGasIsEnough(slowPrice);
      if (isNormalEnough) {
        setGasLevel('normal');
        gasPriceRef.current = normalGasPrice;
      } else if (isSlowEnough) {
        setGasLevel('slow');
        gasPriceRef.current = slowPrice;
      } else {
        setGasLevel('custom');
        gasPriceRef.current = 0;
      }
    }
  }, [payTokenIsNativeToken, gasList, gasLimit, payToken?.raw_amount_hex_str]);

  const closeReserveGasOpen = useCallback(() => {
    setReserveGasOpen(false);
    if (payToken && gasPriceRef.current !== undefined) {
      const val = tokenAmountBn(payToken).minus(
        new BigNumber(gasLimit)
          .times(gasPriceRef.current)
          .div(10 ** nativeTokenDecimals)
      );
      setPayAmount(val.lt(0) ? '0' : val.toString(10));
    }
  }, [payToken, chain, nativeTokenDecimals, gasLimit]);

  const changeGasPrice = useCallback(
    (gasLevel: GasLevel) => {
      gasPriceRef.current = gasLevel.level === 'custom' ? 0 : gasLevel.price;
      setGasLevel(gasLevel.level as GasLevelType);
      closeReserveGasOpen();
    },
    [closeReserveGasOpen]
  );

  const handleBalance = useCallback(() => {
    if (payTokenIsNativeToken) {
      setReserveGasOpen(true);
      return;
    }
    if (!payTokenIsNativeToken && payToken) {
      setPayAmount(tokenAmountBn(payToken).toString(10));
    }
  }, [payToken, payTokenIsNativeToken]);

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
        CHAINS[chain].nativeTokenAddress,
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
        ? tokenAmountBn(payToken).lt(debouncePayAmount)
        : new BigNumber(0).lt(debouncePayAmount),
    [payToken, debouncePayAmount]
  );

  useEffect(() => {
    if (isWrapToken) {
      setFeeRate('0');
    }
    if (autoSlippage) {
      setSlippage(isStableCoin ? '0.1' : '0.5');
    }
  }, [autoSlippage, isWrapToken, isStableCoin]);

  const [quoteList, setQuotesList] = useState<TDexQuoteData[]>([]);
  const visible = useQuoteVisible();

  useEffect(() => {
    setQuotesList([]);
    setActiveProvider(undefined);
  }, [payToken?.id, receiveToken?.id, chain, debouncePayAmount, inSufficient]);

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

  const fetchIdRef = useRef(0);
  const { getAllQuotes, validSlippage } = useQuoteMethods();
  const { loading: quoteLoading, error: quotesError } = useAsync(async () => {
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    if (
      userAddress &&
      payToken?.id &&
      receiveToken?.id &&
      receiveToken &&
      chain &&
      Number(debouncePayAmount) > 0 &&
      feeRate &&
      !inSufficient
    ) {
      setQuotesList((e) =>
        e.map((q) => ({ ...q, loading: true, isBest: false }))
      );
      setActiveProvider(undefined);
      return getAllQuotes({
        userAddress,
        payToken,
        receiveToken,
        slippage: slippage || '0.1',
        chain,
        payAmount: debouncePayAmount,
        fee: feeRate,
        setQuote: setQuote(currentFetchId),
      }).finally(() => {});
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
    debouncePayAmount,
    feeRate,
    // slippage,
  ]);

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
    if (chain && Number(slippage) && payToken?.id && receiveToken?.id) {
      return validSlippage({
        chain,
        slippage,
        payTokenId: payToken?.id,
        receiveTokenId: receiveToken?.id,
      });
    }
  }, [slippage, chain, payToken?.id, receiveToken?.id, refreshId]);
  const openQuote = useSetQuoteVisible();
  const setRefreshId = useSetRefreshId();

  const openQuotesList = useCallback(() => {
    setQuotesList([]);
    setRefreshId((e) => e + 1);
    openQuote(true);
  }, [setSlippageChanged]);

  useEffect(() => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
    setExpired(false);
    setActiveProvider(undefined);
    setSlippageChanged(false);
  }, [payToken?.id, receiveToken?.id, chain, debouncePayAmount, inSufficient]);

  useEffect(() => {
    if (searchObj.chain && searchObj.payTokenId) {
      const target = findChain({
        serverId: searchObj.chain,
      });
      if (target) {
        setChain(target?.enum);
        setPayToken({
          ...getChainDefaultToken(target?.enum),
          id: searchObj.payTokenId,
        });
        setReceiveToken(undefined);
      }
    }
  }, [searchObj?.chain, searchObj?.payTokenId]);

  const rbiSource = useRbiSource();

  useEffect(() => {
    if (rbiSource) {
      stats.report('enterSwapDescPage', {
        refer: rbiSource,
      });
    }
  }, [rbiSource]);

  return {
    bestQuoteDex,
    gasLevel,
    reserveGasOpen,
    closeReserveGasOpen,
    changeGasPrice,
    gasLimit,
    gasList,

    chain,
    switchChain,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,
    exchangeToken,
    payTokenIsNativeToken,

    handleAmountChange,
    handleBalance,
    setPayAmount,
    inputAmount,
    debouncePayAmount,

    isWrapToken,
    wrapTokenSymbol,
    inSufficient,
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,
    feeRate,

    //quote
    openQuotesList,
    quoteLoading,
    quoteList,
    currentProvider,
    setActiveProvider,

    slippageValidInfo,
    slippageValidLoading,

    expired,
  };
};

function getChainDefaultToken(chain: CHAINS_ENUM) {
  const chainInfo = CHAINS[chain];
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
