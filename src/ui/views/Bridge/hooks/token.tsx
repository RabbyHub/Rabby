import { CHAINS_ENUM, ETH_USDT_CONTRACT } from '@/constant';
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, isSameAddress, useWallet } from '@/ui/utils';
import { findChain, findChainByEnum, findChainByServerID } from '@/utils/chain';
import { BridgeQuote, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const useToken = (type: 'from' | 'to') => {
  const refreshId = useRefreshId();

  const userAddress = useRabbySelector(
    (s) => s.account.currentAccount?.address
  );
  const wallet = useWallet();

  const [chain, setChain] = useState<CHAINS_ENUM>();

  const [token, setToken] = useState<TokenItem>();

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

  return [chain, token, setToken, switchChain] as const;
};

export const useBridge = () => {
  const userAddress = useRabbySelector(
    (s) => s.account.currentAccount?.address
  );
  const refreshId = useRefreshId();

  const setRefreshId = useSetRefreshId();

  const wallet = useWallet();
  const [fromChain, fromToken, setFromToken, switchFromChain] = useToken(
    'from'
  );
  const [toChain, toToken, setToToken, switchToChain] = useToken('to');

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

  const inSufficient = useMemo(
    () =>
      fromToken
        ? tokenAmountBn(fromToken).lt(amount)
        : new BigNumber(0).lt(amount),
    [fromToken, amount]
  );

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
      if (!(searchObj?.fromChain && searchObj?.fromTokenId)) {
        switchFromChain(firstEnum);
      }
      if (!(searchObj?.toTokenId && searchObj.toChain)) {
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

  const [quoteList, setQuotesList] = useState<SelectedBridgeQuote[]>([]);

  const setSelectedBridgeQuote = useCallback((quote?: SelectedBridgeQuote) => {
    if (!quote?.manualClick && expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
    if (!quote?.manualClick) {
      expiredTimer.current = setTimeout(() => {
        setRefreshId((e) => e + 1);
      }, 1000 * 30);
    }
    setOriSelectedBridgeQuote(quote);
  }, []);

  useEffect(() => {
    setQuotesList([]);
    setRecommendFromToken(undefined);
  }, [fromToken?.id, toToken?.id, fromChain, toChain, amount, inSufficient]);

  const aggregatorsList = useRabbySelector(
    (s) => s.bridge.aggregatorsList || []
  );

  const fetchIdRef = useRef(0);
  const [
    { loading: quoteLoading, error: quotesError },
    getQuoteList,
  ] = useAsyncFn(async () => {
    fetchIdRef.current += 1;
    if (
      !inSufficient &&
      userAddress &&
      fromToken?.id &&
      toToken?.id &&
      toToken &&
      fromChain &&
      toChain &&
      Number(amount) > 0 &&
      aggregatorsList.length > 0
    ) {
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
            const data = await wallet.openapi
              .getBridgeQuoteV2({
                aggregator_id: bridgeAggregator.id,
                user_addr: userAddress,
                from_chain_id: alternativeToken?.chain || fromToken.chain,
                from_token_id: alternativeToken?.id || fromToken.id,
                from_token_raw_amount: alternativeToken
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
                to_chain_id: toToken.chain,
                to_token_id: toToken.id,
                slippage: new BigNumber(slippageObj.slippageState)
                  .div(100)
                  .toString(10),
              })
              .catch((e) => {
                if (
                  currentFetchId === fetchIdRef.current &&
                  !alternativeToken
                ) {
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
            if (recommendFromToken?.token_list?.[0]) {
              await getQUoteV2(recommendFromToken?.token_list?.[0]);
            } else {
              setRecommendFromToken(undefined);
            }
          } catch (error) {
            setRecommendFromToken(undefined);
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
    setSelectedBridgeQuote(undefined);
  }, [
    inSufficient,
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

  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (
      !inSufficient &&
      userAddress &&
      fromToken?.id &&
      toToken?.id &&
      toToken &&
      fromChain &&
      toChain &&
      Number(amount) > 0 &&
      aggregatorsList.length > 0
    ) {
      setPending(true);
    } else {
      setPending(false);
    }
  }, [
    inSufficient,
    userAddress,
    fromToken?.id,
    toToken?.id,
    toToken,
    fromChain,
    toChain,
    Number(amount),
    aggregatorsList.length,
    refreshId,
  ]);

  const [, cancelDebounce] = useDebounce(
    () => {
      getQuoteList();
    },
    300,
    [getQuoteList]
  );

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
    if (!quoteLoading && toToken && quoteList.every((e) => !e.loading)) {
      const sortedList = quoteList?.sort((b, a) => {
        return new BigNumber(a.to_token_amount)
          .times(toToken.price || 1)
          .minus(a.gas_fee.usd_value)
          .minus(
            new BigNumber(b.to_token_amount)
              .times(toToken.price || 1)
              .minus(b.gas_fee.usd_value)
          )
          .toNumber();
      });
      if (
        sortedList[0] &&
        sortedList[0]?.bridge_id &&
        sortedList[0]?.aggregator?.id
      ) {
        setBestQuoteId({
          bridgeId: sortedList[0]?.bridge_id,
          aggregatorId: sortedList[0]?.aggregator?.id,
        });

        let useQuote = sortedList[0];

        setOriSelectedBridgeQuote((preItem) => {
          useQuote = preItem?.manualClick ? preItem : sortedList[0];
          return preItem;
        });

        setSelectedBridgeQuote(useQuote);
      }
    }
  }, [quoteList, quoteLoading, toToken]);

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
    fromTokenId?: string;
    inputAmount?: string;
    toChain?: CHAINS_ENUM;
    toTokenId?: string;
    maxNativeTokenGasPrice?: string;
  }>(query2obj(search));

  useEffect(() => {
    let active = true;
    if (!searchObj) {
      return;
    }
    if (searchObj.fromChain && searchObj.fromTokenId) {
      const fromChain = findChain({
        enum: searchObj.fromChain,
      });
      if (userAddress && fromChain) {
        wallet.openapi
          .getToken(userAddress, fromChain.serverId, searchObj.fromTokenId)
          .then((token) => {
            if (active) {
              switchFromChain(fromChain.enum);
              setFromToken(token);
            }
          });
      }
      if (searchObj.inputAmount) {
        handleAmountChange(searchObj.inputAmount);
      }
    }
    if (searchObj.toChain && searchObj.toTokenId) {
      const toChain = findChain({
        enum: searchObj.toChain,
      });
      if (userAddress && toChain) {
        wallet.openapi
          .getToken(userAddress, toChain.serverId, searchObj.toTokenId)
          .then((token) => {
            if (active) {
              switchToChain(toChain.enum);
              setToToken(token);
              console.log('setTo', toChain.enum, token);
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
    amount,
    handleAmountChange,
    showLoss,

    openQuotesList,
    quoteLoading: pending || quoteLoading,
    quoteList,

    bestQuoteId,
    selectedBridgeQuote,

    setSelectedBridgeQuote,

    maxNativeTokenGasPrice,
    setMaxNativeTokenGasPrice,

    ...slippageObj,
  };
};
