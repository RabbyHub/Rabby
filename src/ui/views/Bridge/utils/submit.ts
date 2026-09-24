import pRetry, { AbortError } from 'p-retry';
import { buildTx as buildBridgeTx } from '@rabby-wallet/rabby-bridge';
import type { BridgeTx } from '@rabby-wallet/rabby-bridge';
import stats from '@/stats';
import { findChain } from '@/utils/chain';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import type { BridgeRecord } from '@/background/service/bridge';
import type { SelectedBridgeQuote } from '../hooks';
import {
  formatBridgeSlippageRatio,
  getBridgePayTokenRawAmount,
  getBridgeSlippageRatio,
} from './bridgeQuote';

export const getBridgeQuoteStatsParams = (
  quote: SelectedBridgeQuote,
  fromToken: TokenItem,
  toToken: TokenItem,
  status: 'success' | 'fail'
) => ({
  aggregatorIds: quote.aggregator.id,
  bridgeId: quote.bridge_id,
  fromChainId: fromToken.chain,
  fromTokenId: fromToken.id,
  toTokenId: toToken.id,
  toChainId: toToken.chain,
  status,
});

export const reportBridgeQuoteResult = (
  quote: SelectedBridgeQuote,
  fromToken: TokenItem,
  toToken: TokenItem,
  status: 'success' | 'fail'
) => {
  stats.report(
    'bridgeQuoteResult',
    getBridgeQuoteStatsParams(quote, fromToken, toToken, status)
  );
};

export const buildBridgeQuoteTxParams = ({
  userAddress,
  fromToken,
  toToken,
  amount,
  slippage,
  quote,
}: {
  userAddress: string;
  fromToken: TokenItem;
  toToken: TokenItem;
  amount: string;
  slippage: string;
  quote: SelectedBridgeQuote;
}) => ({
  bridgeId: quote.bridge_id,
  userAddress,
  fromChainId: fromToken.chain,
  fromTokenId: fromToken.id,
  fromTokenRawAmount: getBridgePayTokenRawAmount(amount, fromToken.decimals),
  toChainId: toToken.chain,
  toTokenId: toToken.id,
  slippage: formatBridgeSlippageRatio(slippage),
  quoteKey: quote.quote_key || {},
});

export const requestBridgeQuoteTx = ({
  userAddress,
  fromToken,
  toToken,
  amount,
  slippage,
  quote,
  openapi,
}: {
  userAddress: string;
  fromToken: TokenItem;
  toToken: TokenItem;
  amount: string;
  slippage: string;
  quote: SelectedBridgeQuote;
  openapi: Parameters<typeof buildBridgeTx>[2];
}): Promise<BridgeTx> =>
  pRetry(
    () =>
      buildBridgeTx(
        quote.aggregator.id,
        buildBridgeQuoteTxParams({
          userAddress,
          fromToken,
          toToken,
          amount,
          slippage,
          quote,
        }),
        openapi
      ).catch((e) => {
        throw new AbortError(e?.message || String(e));
      }),
    { retries: 1 }
  );

export const buildBridgeTokenSideParams = ({
  userAddress,
  fromToken,
  toToken,
  amount,
  feeRate,
  slippage,
  quote,
  tx,
  gasPrice,
}: {
  userAddress: string;
  fromToken: TokenItem;
  toToken: TokenItem;
  amount: string;
  feeRate: number | string;
  slippage: string;
  quote: SelectedBridgeQuote;
  tx: BridgeTx;
  gasPrice?: number;
}) => {
  const slippageValue = getBridgeSlippageRatio(slippage);

  return {
    approveId: quote.approve_contract_id,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    payTokenRawAmount: getBridgePayTokenRawAmount(amount, fromToken.decimals),
    chainId: tx.chainId,
    shouldApprove: !!quote.shouldApproveToken,
    shouldTwoStepApprove: !!quote.shouldTwoStepApprove,
    payTokenId: fromToken.id,
    payTokenChainServerId: fromToken.chain,
    gasPrice,
    info: {
      aggregator_id: quote.aggregator.id,
      bridge_id: quote.bridge_id,
      from_chain_id: fromToken.chain,
      from_token_id: fromToken.id,
      from_token_amount: amount,
      to_chain_id: toToken.chain,
      to_token_id: toToken.id,
      to_token_amount: quote.to_token_amount,
      tx,
      rabby_fee: quote.rabby_fee.usd_value,
      fee_rate: Number(feeRate),
      duration: quote.duration,
      slippage: slippageValue,
    } as BridgeRecord,
    addHistoryData: {
      address: userAddress,
      fromChainId: findChain({ serverId: fromToken.chain })?.id || 0,
      toChainId: findChain({ serverId: toToken.chain })?.id || 0,
      fromToken,
      estimatedDuration: quote.duration,
      toToken,
      fromAmount: Number(amount),
      toAmount: Number(quote.to_token_amount),
      slippage: slippageValue,
      dexId: quote.aggregator.id,
      status: 'pending',
      createdAt: Date.now(),
    } as Omit<BridgeTxHistoryItem, 'hash'>,
  };
};
