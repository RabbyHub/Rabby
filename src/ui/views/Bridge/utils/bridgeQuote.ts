import BigNumber from 'bignumber.js';
import { TokenItem } from '@/background/service/openapi';
import type { SelectedBridgeQuote } from '../hooks';

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
