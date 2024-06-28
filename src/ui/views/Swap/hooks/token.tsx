import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync, useDebounce } from 'react-use';
import {
  QuoteProvider,
  TCexQuoteData,
  TDexQuoteData,
  useQuoteMethods,
} from './quote';
import {
  useQuoteVisible,
  useRefreshId,
  useSetRefreshId,
  useSettingVisible,
} from './context';
import { useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
import { useRbiSource } from '@/ui/utils/ga-event';
import stats from '@/stats';
import { useSwapSettings } from './settings';
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { findChain } from '@/utils/chain';

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
  const [slippageState, setSlippage] = useState('0.1');
  const slippage = useMemo(() => slippageState || '0.1', [slippageState]);
  const [slippageChanged, setSlippageChanged] = useState(false);

  return {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,
  };
};

export interface FeeProps {
  fee: '0.25' | '0.1' | '0';
  symbol?: string;
}

export const useTokenPair = (userAddress: string) => {
  const dispatch = useRabbyDispatch();
  const refreshId = useRefreshId();

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
  const handleChain = (c: CHAINS_ENUM) => {
    setChain(c);
    dispatch.swap.setSelectedChain(c);
    // resetSwapTokens(c);
  };

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

  const [payAmount, setPayAmount] = useState('');

  const [feeRate, setFeeRate] = useState<FeeProps['fee']>('0');

  const {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,
  } = useSlippage();

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

  const handleBalance = useCallback(() => {
    if (payToken) {
      setPayAmount(tokenAmountBn(payToken).toString(10));
    }
  }, [payToken]);

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
        ? tokenAmountBn(payToken).lt(payAmount)
        : new BigNumber(0).lt(payAmount),
    [payToken, payAmount]
  );

  useEffect(() => {
    if (isWrapToken) {
      setFeeRate('0');
    } else {
      setFeeRate('0.25');
    }

    if (isStableCoin) {
      setSlippage('0.05');
    }
  }, [isWrapToken, isStableCoin]);

  const [quoteList, setQuotesList] = useState<
    (TCexQuoteData | TDexQuoteData)[]
  >([]);

  useEffect(() => {
    setQuotesList([]);
  }, [payToken?.id, receiveToken?.id, chain, payAmount]);

  const setQuote = useCallback(
    (id: number) => (quote: TCexQuoteData | TDexQuoteData) => {
      if (id === fetchIdRef.current) {
        setQuotesList((e) => {
          const index = e.findIndex((q) => q.name === quote.name);
          // setActiveProvider((activeQuote) => {
          //   if (activeQuote?.name === quote.name) {
          //     return undefined;
          //   }
          //   return activeQuote;
          // });

          const v = { ...quote, loading: false };
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
  const visible = useQuoteVisible();
  const settingVisible = useSettingVisible();

  useEffect(() => {
    if (!visible) {
      setQuotesList([]);
    }
  }, [visible]);

  const setRefreshId = useSetRefreshId();
  const { swapTradeList, swapViewList } = useSwapSettings();

  useDebounce(
    () => {
      if (!settingVisible) {
        setQuotesList([]);
        setRefreshId((e) => e + 1);
      }
    },
    300,
    [swapTradeList, swapViewList, settingVisible]
  );

  const fetchIdRef = useRef(0);
  const { getAllQuotes, validSlippage } = useQuoteMethods();
  const { loading: quoteLoading, error: quotesError } = useAsync(async () => {
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    if (
      visible &&
      userAddress &&
      payToken?.id &&
      receiveToken?.id &&
      receiveToken &&
      chain &&
      payAmount &&
      feeRate
    ) {
      // setActiveProvider((e) => (e ? { ...e, halfBetterRate: '' } : e));
      setQuotesList((e) => e.map((q) => ({ ...q, loading: true })));
      return getAllQuotes({
        userAddress,
        payToken,
        receiveToken,
        slippage: slippage || '0.1',
        chain,
        payAmount: payAmount,
        fee: feeRate,
        setQuote: setQuote(currentFetchId),
      }).finally(() => {
        // enableSwapBySlippageChanged(currentFetchId);
      });
    }
  }, [
    // setActiveProvider,
    setQuotesList,
    setQuote,
    refreshId,
    userAddress,
    payToken?.id,
    receiveToken?.id,
    chain,
    payAmount,
    feeRate,
    slippage,
    visible,
  ]);

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

  useEffect(() => {
    setExpired(false);
    setActiveProvider(undefined);
    setSlippageChanged(false);
  }, [payToken?.id, receiveToken?.id, chain, payAmount, inSufficient]);

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
    payAmount,

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
