// The module under test reaches three barrels that boot the extension runtime
// on import (wallet context, the redux store, i18n, the Hyperliquid SDK). Only
// their formatters are on its path, so they are stubbed ahead of the import.
jest.mock('@/ui/utils', () => ({
  splitNumberByStep: jest.requireActual('@/ui/utils/number').splitNumberByStep,
}));

jest.mock('@/ui/views/Perps/utils', () => ({
  // Same one-liner as the real export: sign-preserving, two decimals.
  formatPerpsPct: (v: number) => `${(v * 100).toFixed(2)}%`,
}));

jest.mock('@/ui/views/DesktopPerps/utils', () => ({
  formatPerpsCoin: (coin: string) => coin,
}));

import type { TFunction } from 'i18next';
import { buildTakeOrStopConfirmContent } from '@/ui/views/DesktopPerps/components/TradingPanel/containers/takeOrStopConfirmContent';
import type { TakeOrStopConfirmParams } from '@/ui/views/DesktopPerps/components/TradingPanel/containers/takeOrStopConfirmContent';

const t = (((key: string) => key) as unknown) as TFunction;

type Content = ReturnType<typeof buildTakeOrStopConfirmContent>;

// BTC-USDC, mark 100,000, a 92,000 trigger and half a coin; each case overrides
// only what it is about.
const params = (
  patch: Partial<TakeOrStopConfirmParams> = {}
): TakeOrStopConfirmParams => ({
  t,
  isBuy: true,
  selectedCoin: 'BTC',
  quoteAsset: 'USDC',
  triggerPrice: '92000',
  priceText: 'page.perpsPro.orderConfirm.marketPrice',
  markPrice: 100000,
  pxDecimals: 2,
  amount: '0.5',
  estLiqPrice: null,
  reduceOnly: false,
  ...patch,
});

const rows = (content: Content) => content.sections?.[0]?.rows ?? [];

const rowValue = (content: Content, key: string) =>
  rows(content).find((row) => row.key === key)?.value;

describe('conditional order confirmation body', () => {
  it('lists the dialog rows in reading order', () => {
    const content = buildTakeOrStopConfirmContent(
      params({ estLiqPrice: 92500 })
    );

    expect(rows(content).map((row) => row.key)).toEqual([
      'triggerPrice',
      'price',
      'markPrice',
      'amount',
      'estLiqPrice',
      'estLiqDistance',
      'reduceOnly',
    ]);
    expect(content.title).toBe('BTC-USDC');
    expect(rowValue(content, 'triggerPrice')).toBe('92,000 USDC');
    expect(rowValue(content, 'price')).toBe(
      'page.perpsPro.orderConfirm.marketPrice'
    );
    expect(rowValue(content, 'markPrice')).toBe('100,000 USDC');
    expect(rowValue(content, 'amount')).toBe('0.5 BTC');
    expect(rowValue(content, 'estLiqPrice')).toBe('92,500 USDC');
  });

  it('drops the trigger and price rows when they carry nothing', () => {
    const content = buildTakeOrStopConfirmContent(
      params({ triggerPrice: '0', priceText: '' })
    );

    expect(rows(content).map((row) => row.key)).toEqual([
      'markPrice',
      'amount',
      'reduceOnly',
    ]);
  });

  it('spells reduce-only out either way', () => {
    expect(
      rowValue(
        buildTakeOrStopConfirmContent(params({ reduceOnly: true })),
        'reduceOnly'
      )
    ).toBe('page.perpsPro.orderConfirm.true');
    expect(
      rowValue(
        buildTakeOrStopConfirmContent(params({ reduceOnly: false })),
        'reduceOnly'
      )
    ).toBe('page.perpsPro.orderConfirm.false');
  });
});

describe('conditional order direction label', () => {
  it('marks a buy as a green Buy/Long', () => {
    expect(
      buildTakeOrStopConfirmContent(params({ isBuy: true })).titleSuffix
    ).toEqual({ text: 'page.perpsPro.orderConfirm.buyLong', tone: 'up' });
  });

  it('marks a sell as a red Sell/Short', () => {
    expect(
      buildTakeOrStopConfirmContent(params({ isBuy: false })).titleSuffix
    ).toEqual({ text: 'page.perpsPro.orderConfirm.sellShort', tone: 'down' });
  });
});

describe('estimated liquidation distance', () => {
  it('is negative when the liquidation price sits below mark', () => {
    const content = buildTakeOrStopConfirmContent(
      params({ isBuy: true, estLiqPrice: 92500 })
    );

    expect(rowValue(content, 'estLiqDistance')).toBe('-7.50%(-7,500)');
  });

  it('is positive when the liquidation price sits above mark', () => {
    const content = buildTakeOrStopConfirmContent(
      params({ isBuy: false, estLiqPrice: 107500 })
    );

    expect(rowValue(content, 'estLiqDistance')).toBe('7.50%(7,500)');
  });

  it('never lets the percentage and the absolute gap disagree in sign', () => {
    [92500, 99999, 100001, 107500].forEach((estLiqPrice) => {
      const value = String(
        rowValue(
          buildTakeOrStopConfirmContent(params({ estLiqPrice })),
          'estLiqDistance'
        )
      );
      const [percent, gap] = value.split('(');

      expect(percent.startsWith('-')).toBe(gap.startsWith('-'));
      expect(percent.startsWith('-')).toBe(estLiqPrice < 100000);
    });
  });

  it('rounds the gap to the market price decimals', () => {
    const content = buildTakeOrStopConfirmContent(
      params({ markPrice: 3000, pxDecimals: 0, estLiqPrice: 2850.4 })
    );

    expect(rowValue(content, 'estLiqPrice')).toBe('2,850 USDC');
    expect(rowValue(content, 'estLiqDistance')).toBe('-4.99%(-150)');
  });

  it('is left out when the mark price is unknown, rather than dividing by it', () => {
    const content = buildTakeOrStopConfirmContent(
      params({ markPrice: 0, estLiqPrice: 92500 })
    );

    expect(rowValue(content, 'estLiqPrice')).toBe('92,500 USDC');
    expect(rowValue(content, 'estLiqDistance')).toBeUndefined();
  });

  it('is left out along with the price when there is no liquidation price', () => {
    [null, undefined].forEach((estLiqPrice) => {
      const content = buildTakeOrStopConfirmContent(params({ estLiqPrice }));

      expect(rowValue(content, 'estLiqPrice')).toBeUndefined();
      expect(rowValue(content, 'estLiqDistance')).toBeUndefined();
    });
  });
});
