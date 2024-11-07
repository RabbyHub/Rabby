import { CHAINS_ENUM, ETH_USDT_CONTRACT } from '@/constant';
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, isSameAddress, useWallet } from '@/ui/utils';
import { findChain, findChainByEnum, findChainByServerID } from '@/utils/chain';
import { BridgeQuote, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsyncFn, useDebounce } from 'react-use';
import useAsync from 'react-use/lib/useAsync';
import {
  useQuoteVisible,
  useRefreshId,
  useSetQuoteVisible,
  useSetRefreshId,
} from './context';
import { getChainDefaultToken, tokenAmountBn } from '@/ui/utils/token';
import BigNumber from 'bignumber.js';
import stats from '@/stats';
import { useBridgeSlippage, useBridgeSlippageStore } from './slippage';
import { isNaN } from 'lodash';

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

  const switchChain = useCallback(
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

  const slippageObj = useBridgeSlippage();

  const [recommendFromToken, setRecommendFromToken] = useState<TokenItem>();

  const [selectedBridgeQuote, setOriSelectedBridgeQuote] = useState<
    SelectedBridgeQuote | undefined
  >();

  const [expired, setExpired] = useState(false);

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

  const { autoSlippage } = useBridgeSlippageStore();

  useEffect(() => {
    if (!isSameTokenLoading && autoSlippage) {
      slippageObj.setSlippage(isSameToken ? '1' : '3');
    }
  }, [autoSlippage, isSameToken, isSameTokenLoading]);

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);
  // the most worth chain is the first
  useAsyncInitializeChainList({
    supportChains: supportedChains,
    onChainInitializedAsync: (firstEnum) => {
      switchFromChain(firstEnum);
      getRecommendToChain(firstEnum);
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

  const setSelectedBridgeQuote: React.Dispatch<
    React.SetStateAction<SelectedBridgeQuote | undefined>
  > = useCallback((p) => {
    if (expiredTimer.current) {
      clearTimeout(expiredTimer.current);
    }
    setExpired(false);
    expiredTimer.current = setTimeout(() => {
      setExpired(true);
      setRefreshId((e) => e + 1);
    }, 1000 * 30);
    setOriSelectedBridgeQuote(p);
  }, []);

  useEffect(() => {
    setQuotesList([]);
    setSelectedBridgeQuote(undefined);
  }, [fromToken?.id, toToken?.id, fromChain, toChain, amount, inSufficient]);

  const visible = useQuoteVisible();

  // useEffect(() => {
  //   if (!visible) {
  //     setQuotesList([]);
  //   }
  // }, [visible]);

  const aggregatorsList = useRabbySelector(
    (s) => s.bridge.aggregatorsList || []
  );

  const fetchIdRef = useRef(0);
  const [
    { loading: quoteLoading, error: quotesError },
    getQuoteList,
  ] = useAsyncFn(async () => {
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
      fetchIdRef.current += 1;
      const currentFetchId = fetchIdRef.current;

      let isEmpty = false;
      const result: SelectedBridgeQuote[] = [];

      setQuotesList((e) => {
        if (!e.length) {
          isEmpty = true;
        }
        return e?.map((e) => ({ ...e, loading: true }));
      });

      setSelectedBridgeQuote(undefined);

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
              if (data && currentFetchId === fetchIdRef.current) {
                setRecommendFromToken(alternativeToken);
                return;
              }
            }
            if (data && currentFetchId === fetchIdRef.current) {
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
    // setQuotesList([]);
    // setRefreshId((e) => e + 1);
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

        setSelectedBridgeQuote((preItem) =>
          preItem?.manualClick ? preItem : sortedList[0]
        );
      }
    }
  }, [quoteList, quoteLoading, toToken]);

  if (quotesError) {
    console.error('quotesError', quotesError);
  }

  useEffect(() => {
    setExpired(false);
    setSelectedBridgeQuote(undefined);
    setRecommendFromToken(undefined);
  }, [fromToken?.id, toToken?.id, fromChain, toChain, amount, inSufficient]);

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

  return {
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

    expired,

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
    ...slippageObj,
  };
};
