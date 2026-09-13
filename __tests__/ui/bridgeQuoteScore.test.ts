import type { TokenItem } from '@/background/service/openapi';
import type { SelectedBridgeQuote } from '@/ui/views/Bridge/hooks';
import {
  bridgeQuoteEstimatedValueBn,
  bridgeQuoteScore,
} from '@/ui/views/Bridge/utils/bridgeQuote';

const quote = ({
  aggregatorId,
  bridgeId,
  amount,
  duration,
  gasUsd,
}: {
  aggregatorId: string;
  bridgeId: string;
  amount: string;
  duration: number;
  gasUsd: number;
}): SelectedBridgeQuote =>
  (({
    aggregator: { id: aggregatorId },
    bridge_id: bridgeId,
    to_token_amount: amount,
    duration,
    gas_fee: { usd_value: gasUsd },
  } as unknown) as SelectedBridgeQuote);

const token = (price: number): TokenItem =>
  (({
    price,
  } as unknown) as TokenItem);

const getBestBridgeQuote = (
  quotes: SelectedBridgeQuote[],
  receiveToken: TokenItem
) => {
  let best = quotes[0];
  let bestScore = bridgeQuoteScore(quotes[0], receiveToken);
  for (let i = 1; i < quotes.length; i += 1) {
    const score = bridgeQuoteScore(quotes[i], receiveToken);
    if (score.gt(bestScore)) {
      bestScore = score;
      best = quotes[i];
    }
  }
  return best;
};

describe('bridgeQuoteScore', () => {
  it('ranks by receive amount only when receive-token price is 0', () => {
    const slowMoreAmount = quote({
      aggregatorId: 'a',
      bridgeId: 'slow',
      amount: '10.5',
      duration: 200000,
      gasUsd: 5,
    });
    const fastLessAmount = quote({
      aggregatorId: 'b',
      bridgeId: 'fast',
      amount: '10',
      duration: 0,
      gasUsd: 0,
    });
    const receiveToken = token(0);

    expect(bridgeQuoteScore(slowMoreAmount, receiveToken).toString()).toBe(
      '10.5'
    );
    expect(bridgeQuoteScore(fastLessAmount, receiveToken).toString()).toBe(
      '10'
    );
    expect(
      getBestBridgeQuote([fastLessAmount, slowMoreAmount], receiveToken)
        .bridge_id
    ).toBe('slow');
    expect(
      bridgeQuoteEstimatedValueBn(slowMoreAmount, receiveToken).toString()
    ).toBe('10.5');
  });

  it('still subtracts time cost when receive-token price is available', () => {
    const slowQuote = quote({
      aggregatorId: 'a',
      bridgeId: 'slow',
      amount: '10.5',
      duration: 200000,
      gasUsd: 0,
    });
    const fastQuote = quote({
      aggregatorId: 'b',
      bridgeId: 'fast',
      amount: '10',
      duration: 0,
      gasUsd: 0,
    });
    const receiveToken = token(1);

    expect(bridgeQuoteScore(slowQuote, receiveToken).toNumber()).toBe(9.5);
    expect(bridgeQuoteScore(fastQuote, receiveToken).toNumber()).toBe(10);
    expect(
      getBestBridgeQuote([slowQuote, fastQuote], receiveToken).bridge_id
    ).toBe('fast');
  });
});
