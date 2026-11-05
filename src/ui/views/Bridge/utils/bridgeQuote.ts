import BigNumber from 'bignumber.js';
import { TokenItem } from '@/background/service/openapi';
import type { SelectedBridgeQuote } from '../hooks';

export const getBridgeQuoteKey = (
  quote: Pick<SelectedBridgeQuote, 'aggregator' | 'bridge_id'>
) => `${quote.aggregator.id}-${quote.bridge_id}`;

export const isSameBridgeQuote = (
  a: Pick<SelectedBridgeQuote, 'aggregator' | 'bridge_id'>,
  b: Pick<SelectedBridgeQuote, 'aggregator' | 'bridge_id'>
) => getBridgeQuoteKey(a) === getBridgeQuoteKey(b);

export const BRIDGE_SLIPPAGE_PERCENT_FALLBACK = '1';

export const getBridgePayTokenRawAmount = (amount: string, decimals: number) =>
  new BigNumber(amount)
    .times(10 ** decimals)
    .toFixed(0, 1)
    .toString();

export const resolveBridgeSlippagePercent = (slippagePercent: string) =>
  slippagePercent || BRIDGE_SLIPPAGE_PERCENT_FALLBACK;

const bridgeSlippageRatioBn = (slippagePercent: string) =>
  new BigNumber(resolveBridgeSlippagePercent(slippagePercent)).div(100);

export const formatBridgeSlippageRatio = (slippagePercent: string) =>
  bridgeSlippageRatioBn(slippagePercent).toString(10);

export const getBridgeSlippageRatio = (slippagePercent: string) =>
  bridgeSlippageRatioBn(slippagePercent).toNumber();

export const bridgeQuoteEstimatedValueBn = (
  quote: SelectedBridgeQuote,
  receiveToken: TokenItem
) => {
  const receiveAmount = new BigNumber(quote.to_token_amount);

  if (!receiveToken.price) {
    return receiveAmount;
  }

  return receiveAmount.times(receiveToken.price).minus(quote.gas_fee.usd_value);
};

const PER_MINUTE_TIME_COST = 20000;
const SECONDS_PER_MINUTE = 60;

/**
 * Best quote scoring formula: score = amount_usd - gas_fee_usd - time_cost_usd
 * Time cost per second = amount_usd / 20K / 60, capped at $1 USD
 * If the receive-token price is unavailable, rank by receive amount only.
 */
export const bridgeQuoteScore = (
  quote: SelectedBridgeQuote,
  receiveToken: TokenItem
) => {
  const receiveAmount = new BigNumber(quote.to_token_amount);

  if (!receiveToken.price) {
    return receiveAmount;
  }

  const amountUsd = receiveAmount.times(receiveToken.price);
  const gasFeeUsd = new BigNumber(quote.gas_fee.usd_value);
  const timeCostUsd = BigNumber.min(
    amountUsd
      .div(PER_MINUTE_TIME_COST)
      .times(quote.duration)
      .div(SECONDS_PER_MINUTE),
    1
  );

  return amountUsd.minus(gasFeeUsd).minus(timeCostUsd);
};
