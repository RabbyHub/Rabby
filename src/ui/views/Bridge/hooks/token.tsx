import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { WrapTokenAddressMap } from '@rabby-wallet/rabby-swap';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync, useDebounce } from 'react-use';

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
import { useAsyncInitializeChainList } from '@/ui/hooks/useChain';
import { ETH_USDT_CONTRACT, SWAP_SUPPORT_CHAINS } from '@/constant';
import { findChain } from '@/utils/chain';
import { BridgeQuote } from '@/background/service/openapi';

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
  fee: '0.3' | '0.1' | '0';
  symbol?: string;
}

export interface SelectedBridgeQuote extends BridgeQuote {
  shouldApproveToken?: boolean;
  shouldTwoStepApprove?: boolean;
  loading?: boolean;
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
      initialSelectedChain: state.bridge.$$initialSelectedChain,
      oChain: state.bridge.selectedChain || CHAINS_ENUM.ETH,
      defaultSelectedFromToken: state.bridge.selectedFromToken,
      defaultSelectedToToken: state.bridge.selectedToToken,
    };
  });

  const [chain, setChain] = useState(oChain);
  const handleChain = (c: CHAINS_ENUM) => {
    setChain(c);
    dispatch.bridge.setSelectedChain(c);
  };

  const [payToken, setPayToken] = useTokenInfo({
    userAddress,
    chain: defaultSelectedFromToken?.chain
      ? findChain({ serverId: defaultSelectedFromToken?.chain })?.enum
      : undefined,
    defaultToken: defaultSelectedFromToken,
  });

  const [receiveToken, setReceiveToken] = useTokenInfo({
    userAddress,
    chain,
    defaultToken: defaultSelectedToToken,
  });

  const setActiveProvider: React.Dispatch<
    React.SetStateAction<SelectedBridgeQuote | undefined>
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
      setPayToken(undefined);
      setReceiveToken(undefined);
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

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);

  useAsyncInitializeChainList({
    // NOTICE: now `useTokenPair` is only used for swap page, so we can use `SWAP_SUPPORT_CHAINS` here
    supportChains: supportedChains,
    onChainInitializedAsync: (firstEnum) => {
      // only init chain if it's not cached before
      if (!searchObj?.chain && !searchObj.payTokenId && !initialSelectedChain) {
        switchChain(firstEnum);
      }
    },
  });

  useEffect(() => {
    dispatch.bridge.setSelectedFromToken(payToken);
  }, [payToken]);

  useEffect(() => {
    dispatch.bridge.setSelectedToToken(receiveToken);
  }, [receiveToken]);

  const [payAmount, setPayAmount] = useState('');

  const [feeRate] = useState<FeeProps['fee']>('0');

  const {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,
  } = useSlippage();

  const [currentProvider, setOriActiveProvider] = useState<
    SelectedBridgeQuote | undefined
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
    // if (isWrapToken) {
    //   setFeeRate('0');
    // } else if (isStableCoin) {
    //   setFeeRate('0.1');
    // } else {
    //   setFeeRate('0.3');
    // }

    if (isStableCoin) {
      setSlippage('0.05');
    }
  }, [isWrapToken, isStableCoin]);

  const [quoteList, setQuotesList] = useState<SelectedBridgeQuote[]>([]);

  useEffect(() => {
    setQuotesList([]);
  }, [payToken?.id, receiveToken?.id, chain, payAmount]);

  const visible = useQuoteVisible();
  const settingVisible = useSettingVisible();

  useEffect(() => {
    if (!visible) {
      setQuotesList([]);
    }
  }, [visible]);

  const setRefreshId = useSetRefreshId();

  useDebounce(
    () => {
      if (!settingVisible) {
        setQuotesList([]);
        setRefreshId((e) => e + 1);
      }
    },
    300,
    [settingVisible]
  );

  const aggregatorsList = useRabbySelector(
    (s) => s.bridge.aggregatorsList || []
  );
  const selectedAggregators = useRabbySelector(
    (s) => s.bridge.selectedAggregators || []
  );

  const avalibleSelectedAggregators = useMemo(() => {
    return selectedAggregators?.filter((e) =>
      aggregatorsList.some((item) => item.id === e)
    );
  }, []);

  const fetchIdRef = useRef(0);
  const wallet = useWallet();
  const { loading: quoteLoading, error: quotesError } = useAsync(async () => {
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

      const data = await wallet.openapi
        .getBridgeQuoteList({
          aggregator_ids: avalibleSelectedAggregators.join(','),
          from_token_id: payToken.id,
          user_addr: userAddress,
          from_chain_id: payToken.chain,
          from_token_raw_amount: new BigNumber(payAmount)
            .times(10 ** payToken.decimals)
            .toFixed(0, 1)
            .toString(),
          to_chain_id: receiveToken.chain,
          to_token_id: receiveToken.id,
        })
        .finally(() => {
          // enableSwapBySlippageChanged(currentFetchId);
        });

      if (data && currentFetchId === fetchIdRef.current) {
        await Promise.allSettled(
          data.map((e) =>
            wallet.openapi
              .getBridgeQuote({
                aggregator_id: e.aggregator.id,
                bridge_id: e.bridge.id,
                from_token_id: payToken.id,
                user_addr: userAddress,
                from_chain_id: payToken.chain,
                from_token_raw_amount: new BigNumber(payAmount)
                  .times(10 ** payToken.decimals)
                  .toFixed(0, 1)
                  .toString(),
                to_chain_id: receiveToken.chain,
                to_token_id: receiveToken.id,
              })
              .then(async (data) => {
                if (currentFetchId !== fetchIdRef.current) {
                  return;
                }
                let tokenApproved = false;
                let allowance = '0';
                const fromChain = findChain({ serverId: payToken?.chain });
                if (payToken?.id === fromChain?.nativeTokenAddress) {
                  tokenApproved = true;
                } else {
                  allowance = await wallet.getERC20Allowance(
                    payToken.chain,
                    payToken.id,
                    data.tx.to
                  );
                  tokenApproved = new BigNumber(allowance).gte(
                    new BigNumber(payAmount).times(10 ** payToken.decimals)
                  );
                }
                let shouldTwoStepApprove = false;
                if (
                  fromChain?.enum === CHAINS_ENUM.ETH &&
                  isSameAddress(payToken.id, ETH_USDT_CONTRACT) &&
                  Number(allowance) !== 0 &&
                  !tokenApproved
                ) {
                  shouldTwoStepApprove = true;
                }

                // return {
                //   ...data,
                //   loading: false,
                //   shouldTwoStepApprove,
                //   shouldApproveToken: !tokenApproved,
                // };

                if (isEmpty) {
                  result.push({
                    ...data,
                    shouldTwoStepApprove,
                    shouldApproveToken: !tokenApproved,
                  });
                } else {
                  if (currentFetchId === fetchIdRef.current) {
                    setQuotesList((e) => {
                      const filteredArr = e.filter(
                        (item) =>
                          item.aggregator.id !== data.aggregator.id ||
                          item.bridge.id !== data.bridge.id
                      );
                      return [
                        ...filteredArr,
                        {
                          ...data,
                          loading: false,
                          shouldTwoStepApprove,
                          shouldApproveToken: !tokenApproved,
                        },
                      ];
                    });
                  }
                }
              })
          )
        );

        if (isEmpty && currentFetchId === fetchIdRef.current) {
          setQuotesList(result);
        }

        // await Promise.allSettled(
        //   data?.map((e) =>
        //     wallet.openapi
        //       .getBridgeQuote({
        //         aggregator_id: e.aggregator.id,
        //         bridge_id: e.bridge.id,
        //         from_token_id: payToken.id,
        //         user_addr: userAddress,
        //         from_chain_id: payToken.chain,
        //         from_token_raw_amount: new BigNumber(payAmount)
        //           .times(10 ** payToken.decimals)
        //           .toFixed(0, 1)
        //           .toString(),
        //         to_chain_id: receiveToken.chain,
        //         to_token_id: receiveToken.id,
        //       })
        //       .then(async (data) => {
        //         let tokenApproved = false;
        //         let allowance = '0';

        // const fromChain = findChain({ serverId: payToken?.chain });
        //         if (
        //           payToken?.id ===
        //           fromChain?.nativeTokenAddress
        //         ) {
        //           tokenApproved = true;
        //         } else {
        //           allowance = await wallet.getERC20Allowance(
        //             payToken.chain,
        //             payToken.id,
        //             data.tx.to
        //           );

        //           tokenApproved = new BigNumber(allowance).gte(
        //             new BigNumber(payAmount).times(10 ** payToken.decimals)
        //           );
        //         }

        //         let shouldTwoStepApprove = false;

        //         if (
        //           fromChain?.enum === CHAINS_ENUM.ETH &&
        //           isSameAddress(payToken.id, ETH_USDT_CONTRACT) &&
        //           Number(allowance) !== 0 &&
        //           !tokenApproved
        //         ) {
        //           shouldTwoStepApprove = true;
        //         }

        //         setQuotesList((e) => [
        //           ...e,
        //           {
        //             ...data,
        //             shouldApproveToken: !tokenApproved,
        //             shouldTwoStepApprove,
        //           },
        //         ]);
        //       })
        //   )
        // );
      }
    }
  }, [
    // setActiveProvider,
    setQuotesList,
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

  // const {
  //   value: slippageValidInfo,
  //   error: slippageValidError,
  //   loading: slippageValidLoading,
  // } = useAsync(async () => {
  //   if (chain && Number(slippage) && payToken?.id && receiveToken?.id) {
  //     return validSlippage({
  //       chain,
  //       slippage,
  //       payTokenId: payToken?.id,
  //       receiveTokenId: receiveToken?.id,
  //     });
  //   }
  // }, [slippage, chain, payToken?.id, receiveToken?.id, refreshId]);

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
      // stats.report('enterSwapDescPage', {
      //   refer: rbiSource,
      // });
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
