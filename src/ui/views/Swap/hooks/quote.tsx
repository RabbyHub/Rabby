import { DEX, ETH_USDT_CONTRACT, SWAP_FEE_ADDRESS } from '@/constant';
import { formatUsdValue, isSameAddress, useWallet } from '@/ui/utils';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem, Tx } from '@rabby-wallet/rabby-api/dist/types';
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
import { ChainGas } from '@/background/service/preference';
import { verifySdk } from './verify';
import { findChainByEnum } from '@/utils/chain';

export interface validSlippageParams {
  chain: CHAINS_ENUM;
  slippage: string;
  payTokenId: string;
  receiveTokenId: string;
}

export const useQuoteMethods = () => {
  const walletController = useWallet();
  const walletOpenapi = walletController.openapi;

  const nativeTokenPriceRef = useRef<Promise<TokenItem>>();

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
    >) => {
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

  const getPreEstimateGasUsed = React.useCallback(
    async ({
      userAddress,
      chain,
      payToken,
      receiveToken,
      payAmount,
      dexId,
      quote,
    }: getPreExecResultParams) => {
      const chainInfo = findChainByEnum(chain)!;
      const nonce = await walletController.getRecommendNonce({
        from: userAddress,
        chainId: chainInfo.id,
      });

      const getGasUsed = async () => {
        if (isSwapWrapToken(payToken.id, receiveToken.id, chain)) {
          const data = await walletOpenapi.estimateGasUsd({
            tx: {
              ...quote.tx,
              nonce: nonce,
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
      };

      const [
        lastTimeGas,
        gasMarket,
        [tokenApproved, shouldTwoStepApprove],
        nativeToken,
        gasUsed,
      ] = await Promise.all([
        walletController.getLastTimeGasSelection(chainInfo.id),
        walletController.gasMarketV2({
          chain: chainInfo,
          tx: {
            ...quote.tx,
            nonce,
            chainId: chainInfo.id,
            gas: '0x0',
          },
        }),
        getTokenApproveStatus({
          payToken,
          receiveToken,
          payAmount,
          chain,
          dexId,
        }),
        nativeTokenPriceRef.current!,
        getGasUsed(),
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
      walletController.getRecommendNonce,
      walletController.generateApproveTokenTx,
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
    }: getDexQuoteParams & {
      setQuote?: (quote: TDexQuoteData) => void;
      inSufficient: boolean;
    }): Promise<TDexQuoteData> => {
      const isOpenOcean = dexId === DEX_ENUM.OPENOCEAN;
      try {
        let gasPrice: number;
        if (isOpenOcean) {
          const gasMarket = await walletController.gasMarketV2({
            chainId: findChainByEnum(chain)!.serverId,
          });
          gasPrice = gasMarket?.[1]?.price;
        }
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
              gasPrice,
              fee: true,
              chainServerId: findChainByEnum(chain)!.serverId,
              nativeTokenAddress: findChainByEnum(chain)!.nativeTokenAddress,
              insufficient: inSufficient,
            },
            walletOpenapi
          );

        const data = await getData();

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
        setQuote?.(quote);
        return quote;
      }
    },
    [walletOpenapi, pRetry, getPreEstimateGasUsed]
  );

  const supportedDEXList = useRabbySelector((s) => s.swap.supportedDEXList);

  const getAllQuotes = React.useCallback(
    async (
      params: Omit<getDexQuoteParams, 'dexId'> & {
        setQuote: (quote: TDexQuoteData) => void;
      }
    ) => {
      const chainObj = findChainByEnum(params.chain)!;

      nativeTokenPriceRef.current = pRetry(
        () =>
          walletOpenapi.getToken(
            params.userAddress,
            chainObj.serverId,
            chainObj.nativeTokenAddress
          ),
        { retries: 1 }
      );

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
        });
      }

      return Promise.all([
        ...(supportedDEXList.filter((e) => DEX[e]) as DEX_ENUM[]).map((dexId) =>
          getDexQuote({ ...params, dexId })
        ),
      ]);
    },
    [getDexQuote]
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
