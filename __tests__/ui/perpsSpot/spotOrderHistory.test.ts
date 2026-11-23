import type {
  SpotMeta,
  UserHistoricalOrders,
  WsFill,
} from '@rabby-wallet/hyperliquid-sdk';

import { buildSpotMarkets } from '@/ui/views/PerpsSpot/utils/spotMarkets';
import {
  buildSpotOrderHistoryItems,
  getSpotOrderHistoryStatus,
} from '@/ui/views/PerpsSpot/utils/spotOrderHistory';

const spotMeta: SpotMeta = {
  tokens: [
    { name: 'USDC', index: 0, szDecimals: 8 },
    { name: 'HYPE', index: 150, szDecimals: 2 },
  ],
  universe: [{ name: '@107', index: 107, tokens: [150, 0] }],
};
const markets = buildSpotMarkets(spotMeta, { '@107': '38.5' });

const entry = (
  coin: string,
  oid: number,
  status: string,
  sz: string,
  origSz: string,
  statusTimestamp: number
) =>
  ({
    order: {
      coin,
      oid,
      side: 'B',
      sz,
      origSz,
      limitPx: '40',
      timestamp: statusTimestamp - 10,
    },
    status,
    statusTimestamp,
  } as UserHistoricalOrders);

const fill = (oid: number, px: string, sz: string) =>
  ({ oid, px, sz, coin: '@107' } as WsFill);

describe('getSpotOrderHistoryStatus', () => {
  it('collapses lifecycle statuses', () => {
    expect(getSpotOrderHistoryStatus('filled')).toBe('filled');
    expect(getSpotOrderHistoryStatus('canceled')).toBe('canceled');
    expect(getSpotOrderHistoryStatus('selfTradeCanceled')).toBe('canceled');
    expect(getSpotOrderHistoryStatus('iocCancelRejected')).toBe('rejected');
    expect(getSpotOrderHistoryStatus('insufficientSpotBalanceRejected')).toBe(
      'rejected'
    );
    expect(getSpotOrderHistoryStatus('open')).toBeNull();
    expect(getSpotOrderHistoryStatus('triggered')).toBeNull();
  });
});

describe('buildSpotOrderHistoryItems', () => {
  it('keeps closed spot orders newest first with fill details', () => {
    const items = buildSpotOrderHistoryItems(
      [
        entry('@107', 1, 'filled', '0', '2', 100),
        entry('@107', 2, 'canceled', '0.5', '1.5', 300),
        entry('BTC', 3, 'filled', '0', '1', 400),
        entry('@107', 4, 'open', '1', '1', 500),
        entry('@107', 5, 'iocCancelRejected', '1', '1', 200),
      ],
      [fill(1, '38', '1'), fill(1, '39', '1'), fill(2, '37.5', '1')],
      markets
    );
    expect(items.map((item) => [item.oid, item.status])).toEqual([
      [2, 'canceled'],
      [5, 'rejected'],
      [1, 'filled'],
    ]);
    expect(items[0]).toMatchObject({ filledSz: '1', avgPx: '37.5' });
    expect(items[1]).toMatchObject({ filledSz: '0', avgPx: null });
    expect(items[2]).toMatchObject({ filledSz: '2', avgPx: '38.5' });
  });

  it('applies the limit', () => {
    const history = [1, 2, 3].map((oid) =>
      entry('@107', oid, 'filled', '0', '1', oid)
    );
    expect(
      buildSpotOrderHistoryItems(history, [], markets, 2).map((i) => i.oid)
    ).toEqual([3, 2]);
  });

  it('handles empty input', () => {
    expect(buildSpotOrderHistoryItems(undefined, undefined, markets)).toEqual(
      []
    );
  });
});
