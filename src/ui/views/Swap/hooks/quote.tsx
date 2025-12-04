import { DEX, ETH_USDT_CONTRACT, SWAP_FEE_ADDRESS } from '@/constant';
import { formatUsdValue, isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { GasLevel, TokenItem, Tx } from '@rabby-wallet/rabby-api/dist/types';
import {
  DEX_ENUM,
  DEX_ROUTER_WHITELIST,
  DEX_SPENDER_WHITELIST,
  WrapTokenAddressMap,
} from '@rabby-wallet/rabby-swap';
import { QuoteResult, getQuote } from '@rabby-wallet/rabby-swap/dist/quote';
import BigNumber from 'bignumber.js';
import React, { useRef } from 'react';
import pRetry from 'p-retry';
import { useRabbySelector } from '@/ui/store';
import stats from '@/stats';
import { verifySdk } from './verify';
import { findChainByEnum } from '@/utils/chain';
import { ChainGas } from '@/background/service/preference';

export interface validSlippageParams {
  chain: CHAINS_ENUM;
  slippage: string;
  payTokenId: string;
  receiveTokenId: string;
}

export const useQuoteMethods = () => {
  const walletController = useWallet();
  const walletOpenapi = walletController.openapi;

  const nativeTokenPriceCache = useRef<Promise<TokenItem>>();
  const recommendNonceTaskCache = useRef<Promise<string>>();
  const gasMarketTaskCache = useRef<Promise<GasLevel[]>>();

  const validSlippage = React.useCallback(
    async ({
      chain,
      slippage,
      payTokenId,
      receiveTokenId,
    }: validSlippageParams) => {
      const p = {
        slippage: new BigNumber(slippage).div(100).toString(),
        chain_id: findChainByEnum(chain)!.serverId,
        from_token_id: payTokenId,
        to_token_id: receiveTokenId,
      };

      return walletOpenapi.checkSlippage(p);
    },
    [walletOpenapi]
  );

  const getSwapList = React.useCallback(
    async (addr: string, start = 0, limit = 5) => {
      const data = await walletOpenapi.getSwapTradeList({
        user_addr: addr,
        start: `${start}`,
        limit: `${limit}`,
      });
      return {
        list: data?.history_list,
        last: data,
        totalCount: data?.total_cnt,
      };
    },
    [walletOpenapi]
  );
  const postSwap = React.useCallback(
    async ({
      payToken,
      receiveToken,
      payAmount,
      // receiveRawAmount,
      slippage,
      dexId,
      txId,
      quote,
      tx,
    }: postSwapParams) =>
      walletOpenapi.postSwap({
        quote: {
          pay_token_id: payToken.id,
          pay_token_amount: Number(payAmount),
          receive_token_id: receiveToken.id,
          receive_token_amount: new BigNumber(quote.toTokenAmount)
            .div(10 ** (quote.toTokenDecimals || receiveToken.decimals))
            .toNumber(),
          slippage: new BigNumber(slippage).div(100).toNumber(),
        },
        dex_id: dexId,
        tx_id: txId,
        tx,
      }),
    [walletOpenapi]
  );

  const getToken = React.useCallback(
    async ({ addr, chain, tokenId }: getTokenParams) => {
      return walletOpenapi.getToken(
        addr,
        findChainByEnum(chain)!.serverId,
        tokenId
      );
    },
    [walletOpenapi]
  );

  const getTokenApproveStatus = React.useCallback(
    async ({
      payToken,
      receiveToken,
      payAmount,
      chain,
      dexId,
    }: Pick<
      getDexQuoteParams,
      'payToken' | 'receiveToken' | 'payAmount' | 'chain' | 'dexId'
    >): Promise<[boolean, boolean]> => {
      const chainInfo = findChainByEnum(chain)!;
      if (
        payToken?.id === chainInfo.nativeTokenAddress ||
        isSwapWrapToken(payToken.id, receiveToken.id, chain)
      ) {
        return [true, false];
      }

      const allowance = await walletController.getERC20Allowance(
        chainInfo.serverId,
        payToken.id,
        getSpender(dexId, chain)
      );

      const tokenApproved = new BigNumber(allowance).gte(
        new BigNumber(payAmount).times(10 ** payToken.decimals)
      );

      if (
        chain === CHAINS_ENUM.ETH &&
        isSameAddress(payToken.id, ETH_USDT_CONTRACT) &&
        Number(allowance) !== 0 &&
        !tokenApproved
      ) {
        return [tokenApproved, true];
      }
      return [tokenApproved, false];
    },
    [walletController.getERC20Allowance]
  );

  const getQuoteGasUsed = React.useCallback(
    async ({
      payToken,
      receiveToken,
      chain,
      quote,
      userAddress,
      nonce,
      chainInfo,
    }: {
      payToken: TokenItem;
      receiveToken: TokenItem;
      chain: CHAINS_ENUM;
      quote: QuoteResult;
      userAddress: string;
      nonce: string;
      chainInfo: NonNullable<ReturnType<typeof findChainByEnum>>;
    }) => {
      if (isSwapWrapToken(payToken.id, receiveToken.id, chain)) {
        const data = await walletOpenapi.estimateGasUsd({
          tx: {
            ...quote.tx,
            nonce,
            chainId: chainInfo.id,
            value: `0x${new BigNumber(quote.tx.value).toString(16)}`,
          } as Tx,
          origin: INTERNAL_REQUEST_ORIGIN,
          address: userAddress,
          updateNonce: true,
          pending_tx_list: [],
        });
        return data.gas_used || data.safe_gas_used || 0;
      }
      return quote.gasUsed || 0;
    },
    [walletOpenapi]
  );

  const getRecommendNonceOnce = React.useCallback(
    ({ from, chainId }: { from: string; chainId: number }) => {
      if (recommendNonceTaskCache.current) {
        return recommendNonceTaskCache.current;
      }
      const task = walletController.getRecommendNonce({ from, chainId });
      recommendNonceTaskCache.current = task;
      return task;
    },
    [walletController]
  );

  const getGasMarketOnce = React.useCallback(
    ({
      quote,
      nonce,
      chain,
      chainInfo,
    }: {
      quote?: QuoteResult;
      nonce?: string;
      chain: CHAINS_ENUM;
      chainInfo: NonNullable<ReturnType<typeof findChainByEnum>>;
    }) => {
      const isLinea = chain === CHAINS_ENUM.LINEA;
      const cached = gasMarketTaskCache.current;
      if (cached && !isLinea) {
        return cached;
      }

      if (!isLinea) {
        console.trace('Fetch gas market from network', quote?.tx.to, quote);
        const task = walletController.gasMarketV2({
          chainId: chainInfo.serverId,
        });
        gasMarketTaskCache.current = task;
        return task;
      }

      if (!quote || !nonce) {
        return Promise.reject(new Error('linea gas market requires tx info'));
      }

      const task = walletController.gasMarketV2({
        chain: chainInfo,
        tx: {
          ...quote.tx,
          nonce,
          chainId: chainInfo.id,
        } as Tx,
      });

      return task;
    },
    [walletController]
  );

  type GasMarket = Awaited<ReturnType<typeof walletController.gasMarketV2>>;
  type PreEstimateShared = {
    lastTimeGas: ChainGas | null;
    gasMarket: GasMarket;
    tokenApprove: [boolean, boolean];
    nativeToken: TokenItem;
    gasUsed: number;
  };
  type PreEstimatePrefetched = {
    [K in keyof PreEstimateShared]?:
      | PreEstimateShared[K]
      | Promise<PreEstimateShared[K]>;
  };

  const getPreEstimateGasUsed = React.useCallback(
    async ({
      userAddress,
      chain,
      payToken,
      receiveToken,
      payAmount,
      dexId,
      quote,
      nonce,
      preFetched,
    }: getPreExecResultParams & {
      nonce: string;
      preFetched?: PreEstimatePrefetched;
    }) => {
      const chainInfo = findChainByEnum(chain)!;

      const [
        lastTimeGas,
        gasMarket,
        [tokenApproved, shouldTwoStepApprove],
        nativeToken,
        gasUsed,
      ] = await Promise.all([
        Promise.resolve(
          preFetched?.lastTimeGas ??
            walletController.getLastTimeGasSelection(chainInfo.id)
        ),
        Promise.resolve(
          preFetched?.gasMarket ??
            getGasMarketOnce({ quote, nonce, chain, chainInfo })
        ),
        Promise.resolve(
          preFetched?.tokenApprove ??
            getTokenApproveStatus({
              payToken,
              receiveToken,
              payAmount,
              chain,
              dexId,
            })
        ),
        Promise.resolve(
          preFetched?.nativeToken ?? nativeTokenPriceCache.current!
        ),
        Promise.resolve(
          preFetched?.gasUsed ??
            getQuoteGasUsed({
              payToken,
              receiveToken,
              chain,
              quote,
              userAddress,
              nonce,
              chainInfo,
            })
        ),
      ]);

      const getGasPrice = () => {
        let gasPrice = 0;
        if (
          lastTimeGas?.lastTimeSelect === 'gasPrice' &&
          lastTimeGas.gasPrice
        ) {
          // use cached gasPrice if exist
          gasPrice = lastTimeGas.gasPrice;
        } else if (
          lastTimeGas?.lastTimeSelect &&
          lastTimeGas?.lastTimeSelect === 'gasLevel'
        ) {
          const target = gasMarket.find(
            (item) => item.level === lastTimeGas?.gasLevel
          )!;
          if (target) {
            gasPrice = target.price;
          } else {
            gasPrice =
              gasMarket.find((item) => item.level === 'normal')?.price || 0;
          }
        } else {
          // no cache, use the fast level in gasMarket
          gasPrice =
            gasMarket.find((item) => item.level === 'normal')?.price || 0;
        }
        return gasPrice;
      };

      const gasPrice = getGasPrice();

      const gasUsdValue = new BigNumber(gasUsed)
        .times(gasPrice)
        .div(10 ** nativeToken.decimals)
        .times(nativeToken.price)
        .toString(10);

      return {
        shouldApproveToken: !tokenApproved,
        shouldTwoStepApprove,
        gasPrice,
        gasUsed,
        gasUsdValue,
        gasUsd: formatUsdValue(gasUsdValue),
      };
    },
    [
      walletOpenapi,
      getTokenApproveStatus,
      getGasMarketOnce,
      getQuoteGasUsed,
      walletController,
    ]
  );

  const getDexQuote = React.useCallback(
    async ({
      payToken,
      receiveToken,
      userAddress,
      slippage,
      fee: feeAfterDiscount,
      payAmount,
      chain,
      dexId,
      setQuote,
      inSufficient,
      sharedTasks,
    }: getDexQuoteParams & {
      setQuote?: (quote: TDexQuoteData) => void;
      inSufficient: boolean;
      sharedTasks?: {
        preFetched?: PreEstimatePrefetched;
        recommendNonceTask?: Promise<string>;
      };
    }): Promise<TDexQuoteData> => {
      const isOpenOcean = dexId === DEX_ENUM.OPENOCEAN;
      const chainInfo = findChainByEnum(chain)!;
      const recommendNonceTask = !inSufficient
        ? sharedTasks?.recommendNonceTask ??
          getRecommendNonceOnce({
            from: userAddress,
            chainId: chainInfo.id,
          })
        : null;
      try {
        stats.report('swapRequestQuote', {
          dex: dexId,
          chain,
          fromToken: payToken.id,
          toToken: receiveToken.id,
        });

        const getData = () =>
          getQuote(
            isSwapWrapToken(payToken.id, receiveToken.id, chain)
              ? DEX_ENUM.WRAPTOKEN
              : dexId,
            {
              fromToken: payToken.id,
              toToken: receiveToken.id,
              feeAddress: SWAP_FEE_ADDRESS,
              fromTokenDecimals: payToken.decimals,
              amount: new BigNumber(payAmount)
                .times(10 ** payToken.decimals)
                .toFixed(0, 1),
              userAddress,
              slippage: Number(slippage),
              feeRate:
                feeAfterDiscount === '0' && isOpenOcean
                  ? undefined
                  : Number(feeAfterDiscount) || 0,
              chain,
              fee: true,
              chainServerId: chainInfo.serverId,
              nativeTokenAddress: chainInfo.nativeTokenAddress,
              insufficient: inSufficient,
            },
            walletOpenapi
          );

        const data = await getData();

        console.log('log swapQuoteResult');
        stats.report('swapQuoteResult', {
          dex: dexId,
          chain,
          fromToken: payToken.id,
          toToken: receiveToken.id,
          status: data ? 'success' : 'fail',
        });

        let preExecResult;
        if (data) {
          const { isSdkDataPass } = verifySdk({
            chain,
            dexId,
            slippage,
            data: {
              ...data,
              fromToken: payToken.id,
              fromTokenAmount: new BigNumber(payAmount)
                .times(10 ** payToken.decimals)
                .toFixed(0, 1),
              toToken: receiveToken?.id,
            },
            payToken,
            receiveToken,
          });

          if (inSufficient) {
            const quote: TDexQuoteData = {
              data,
              name: dexId,
              isDex: true,
              preExecResult: {
                gasUsd: '0',
                gasPrice: 0,
                gasUsed: 0,
                gasUsdValue: '0',
                isSdkPass: isSdkDataPass,
                shouldApproveToken: false,
                shouldTwoStepApprove: false,
              },
            };
            setQuote?.(quote);
            return quote;
          }

          try {
            const nonce = await (recommendNonceTask ??
              getRecommendNonceOnce({
                from: userAddress,
                chainId: chainInfo.id,
              }));

            const preFetched = {
              lastTimeGas:
                sharedTasks?.preFetched?.lastTimeGas ??
                walletController.getLastTimeGasSelection(chainInfo.id),
              gasMarket:
                sharedTasks?.preFetched?.gasMarket ??
                getGasMarketOnce({
                  quote: data,
                  nonce,
                  chain,
                  chainInfo,
                }),
              tokenApprove:
                sharedTasks?.preFetched?.tokenApprove ??
                getTokenApproveStatus({
                  payToken,
                  receiveToken,
                  payAmount,
                  chain,
                  dexId,
                }),
              nativeToken:
                sharedTasks?.preFetched?.nativeToken ??
                nativeTokenPriceCache.current!,
              gasUsed:
                sharedTasks?.preFetched?.gasUsed ??
                getQuoteGasUsed({
                  payToken,
                  receiveToken,
                  chain,
                  quote: data,
                  userAddress,
                  nonce,
                  chainInfo,
                }),
            };

            preExecResult = await pRetry(
              () =>
                getPreEstimateGasUsed({
                  userAddress,
                  chain,
                  payToken,
                  receiveToken,
                  payAmount,
                  quote: data,
                  dexId: dexId as DEX_ENUM,
                  inSufficient,
                  nonce,
                  preFetched,
                }),
              {
                retries: 1,
              }
            );

            preExecResult.isSdkPass = isSdkDataPass;
          } catch (error) {
            const quote: TDexQuoteData = {
              data,
              name: dexId,
              isDex: true,
              preExecResult: null,
            };
            setQuote?.(quote);
            return quote;
          }
        } else {
          recommendNonceTask?.catch(() => undefined);
        }
        const quote: TDexQuoteData = {
          data,
          name: dexId,
          isDex: true,
          preExecResult,
        };
        setQuote?.(quote);
        return quote;
      } catch (error) {
        console.error('getQuote error ', error);

        stats.report('swapQuoteResult', {
          dex: dexId,
          chain,
          fromToken: payToken.id,
          toToken: receiveToken.id,
          status: 'fail',
        });

        const quote: TDexQuoteData = {
          data: null,
          name: dexId,
          isDex: true,
          preExecResult: null,
        };
        recommendNonceTask?.catch(() => undefined);
        setQuote?.(quote);
        return quote;
      }
    },
    [
      walletOpenapi,
      pRetry,
      getPreEstimateGasUsed,
      getRecommendNonceOnce,
      getGasMarketOnce,
      getTokenApproveStatus,
      getQuoteGasUsed,
    ]
  );

  const supportedDEXList = useRabbySelector((s) => s.swap.supportedDEXList);

  const getAllQuotes = React.useCallback(
    async (
      params: Omit<getDexQuoteParams, 'dexId'> & {
        setQuote: (quote: TDexQuoteData) => void;
      }
    ) => {
      recommendNonceTaskCache.current = undefined;
      gasMarketTaskCache.current = undefined;
      nativeTokenPriceCache.current = undefined;

      const chainObj = findChainByEnum(params.chain)!;
      nativeTokenPriceCache.current = pRetry(
        () =>
          walletOpenapi.getToken(
            params.userAddress,
            chainObj.serverId,
            chainObj.nativeTokenAddress
          ),
        { retries: 1 }
      );
      const sharedRecommendNonceTask = params.inSufficient
        ? null
        : getRecommendNonceOnce({
            from: params.userAddress,
            chainId: chainObj.id,
          });
      const sharedPreFetched: PreEstimatePrefetched = {
        lastTimeGas: walletController.getLastTimeGasSelection(chainObj.id),
        nativeToken: nativeTokenPriceCache.current!,
      };

      if (params.chain !== CHAINS_ENUM.LINEA) {
        sharedPreFetched.gasMarket = getGasMarketOnce({
          chain: params.chain,
          chainInfo: chainObj,
        });
      }

      if (
        isSwapWrapToken(
          params.payToken.id,
          params.receiveToken.id,
          params.chain
        )
      ) {
        return getDexQuote({
          ...params,
          dexId: DEX_ENUM.WRAPTOKEN,
          sharedTasks: {
            preFetched: sharedPreFetched,
            recommendNonceTask: sharedRecommendNonceTask || undefined,
          },
        });
      }

      return Promise.all([
        ...(supportedDEXList.filter((e) => DEX[e]) as DEX_ENUM[]).map((dexId) =>
          getDexQuote({
            ...params,
            dexId,
            sharedTasks: {
              preFetched: sharedPreFetched,
              recommendNonceTask: sharedRecommendNonceTask || undefined,
            },
          })
        ),
      ]);
    },
    [
      getDexQuote,
      getRecommendNonceOnce,
      walletController,
      getGasMarketOnce,
      supportedDEXList,
      pRetry,
      walletOpenapi,
    ]
  );

  return {
    validSlippage,
    getSwapList,
    postSwap,
    getToken,
    getTokenApproveStatus,
    getPreExecResult: getPreEstimateGasUsed,
    getDexQuote,
    getAllQuotes,
    supportedDEXList,
  };
};

export interface postSwapParams {
  payToken: TokenItem;
  receiveToken: TokenItem;
  payAmount: string;
  // receiveRawAmount: string;
  slippage: string;
  dexId: string;
  txId: string;
  quote: QuoteResult;
  tx: Tx;
}

interface getTokenParams {
  addr: string;
  chain: CHAINS_ENUM;
  tokenId: string;
}

export const getRouter = (dexId: DEX_ENUM, chain: CHAINS_ENUM) => {
  const list = DEX_ROUTER_WHITELIST[dexId as keyof typeof DEX_ROUTER_WHITELIST];
  return list[chain as keyof typeof list];
};

export const getSpender = (dexId: DEX_ENUM, chain: CHAINS_ENUM) => {
  if (dexId === DEX_ENUM.WRAPTOKEN) {
    return '';
  }
  const list =
    DEX_SPENDER_WHITELIST[dexId as keyof typeof DEX_SPENDER_WHITELIST];
  return list[chain as keyof typeof list];
};

const INTERNAL_REQUEST_ORIGIN = window.location.origin;

interface getPreExecResultParams
  extends Omit<getDexQuoteParams, 'fee' | 'slippage'> {
  quote: QuoteResult;
}

export type QuotePreExecResultInfo = {
  shouldApproveToken: boolean;
  shouldTwoStepApprove: boolean;
  // swapPreExecTx: ExplainTxResponse;
  gasPrice: number;
  gasUsed: number;
  gasUsd: string;
  gasUsdValue: string;
  isSdkPass?: boolean;
} | null;

interface getDexQuoteParams {
  payToken: TokenItem;
  receiveToken: TokenItem;
  userAddress: string;
  slippage: string;
  fee: string;
  payAmount: string;
  chain: CHAINS_ENUM;
  dexId: DEX_ENUM;
  inSufficient: boolean;
}

export type TDexQuoteData = {
  data: null | QuoteResult;
  name: string;
  isDex: true;
  preExecResult: QuotePreExecResultInfo;
  loading?: boolean;
  isBest?: boolean;
};

export function isSwapWrapToken(
  payTokenId: string,
  receiveId: string,
  chain: CHAINS_ENUM
) {
  const wrapTokens = [
    WrapTokenAddressMap[chain as keyof typeof WrapTokenAddressMap],
    findChainByEnum(chain)!.nativeTokenAddress,
  ];
  return (
    !!payTokenId &&
    !!receiveId &&
    payTokenId !== receiveId &&
    !!wrapTokens.find((token) => isSameAddress(payTokenId, token)) &&
    !!wrapTokens.find((token) => isSameAddress(receiveId, token))
  );
}

export type QuoteProvider = {
  name: string;
  error?: boolean;
  quote: QuoteResult | null;
  manualClick?: boolean;
  preExecResult: QuotePreExecResultInfo;
  shouldApproveToken: boolean;
  shouldTwoStepApprove: boolean;
  halfBetterRate?: string;
  quoteWarning?: [string, string];
  gasPrice?: number;
  activeLoading?: boolean;
  activeTx?: string;
  actualReceiveAmount: string | number;
  gasUsd?: string;
};
