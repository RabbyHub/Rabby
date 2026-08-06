// The module under test reaches two barrels that boot the extension runtime
// on import (wallet context, the redux store, i18n, the Hyperliquid SDK). Only
// their formatters are on its path, so they are stubbed ahead of the import.
jest.mock('@/ui/utils', () => ({
  splitNumberByStep: jest.requireActual('@/ui/utils/number').splitNumberByStep,
}));

jest.mock('@/ui/views/DesktopPerps/utils', () => ({
  formatPerpsCoin: (coin: string) => coin,
}));

// The two live cells are `.tsx`, which jest's transform (`^.+\.[tj]s$`) does not
// cover. They are redux-subscribing presentation only — the assertions here are
// about which rows exist and what the builder hands them — so they are stubbed
// to identifiable markers rather than dragging a React transform into this
// suite.
jest.mock('@/ui/views/DesktopPerps/modal/OrderConfirmLiveValues', () => ({
  LiveMarkPrice: 'LiveMarkPrice',
  ConfirmAmount: 'ConfirmAmount',
}));

import type { TFunction } from 'i18next';
import { buildTakeOrStopConfirmContent } from '@/ui/views/DesktopPerps/components/TradingPanel/containers/takeOrStopConfirmContent';
import type { TakeOrStopConfirmParams } from '@/ui/views/DesktopPerps/components/TradingPanel/containers/takeOrStopConfirmContent';

const t = (((key: string) => key) as unknown) as TFunction;

type Content = ReturnType<typeof buildTakeOrStopConfirmContent>;

// The liquidation cells are live components owned by the containers; the
// builder only decides whether their rows exist, so plain sentinels stand in
// for them here.
const LIQ_PRICE_CELL = '<liq-price>';
const LIQ_DISTANCE_CELL = '<liq-distance>';

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
  // Only used to convert the size into the quote asset when the panel's unit
  // toggle is on `usd`; the row's base-unit rendering ignores it.
  amountPrice: 100000,
  liqPriceCell: undefined,
  liqDistanceCell: undefined,
  reduceOnly: false,
  ...patch,
});

const rows = (content: Content) => content.sections?.[0]?.rows ?? [];

const rowValue = (content: Content, key: string) =>
  rows(content).find((row) => row.key === key)?.value;

/** Element type + props of a row whose value is one of the live cells. */
const liveCell = (content: Content, key: string) => {
  const el = rowValue(content, key) as
    | { type: unknown; props: Record<string, unknown> }
    | undefined;
  return el && { type: el.type, props: el.props };
};

describe('conditional order confirmation body', () => {
  it('lists the dialog rows in reading order', () => {
    const content = buildTakeOrStopConfirmContent(
      params({
        liqPriceCell: LIQ_PRICE_CELL,
        liqDistanceCell: LIQ_DISTANCE_CELL,
      })
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

    // Mark price ticks and the size unit follows a global toggle, so these two
    // are live cells rather than strings baked in at click time. What matters
    // here is that the builder hands them the right inputs — in particular
    // that `amount` is the base-asset size the order will submit.
    expect(liveCell(content, 'markPrice')).toEqual({
      type: 'LiveMarkPrice',
      props: expect.objectContaining({ coin: 'BTC', fallback: 100000 }),
    });
    expect(liveCell(content, 'amount')).toEqual({
      type: 'ConfirmAmount',
      props: expect.objectContaining({ amount: '0.5', coin: 'BTC' }),
    });
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

// The liquidation figures move with the market, so the containers pass live
// cells and the builder only places them. It must not reformat or re-derive
// either one, and each row stands or falls on its own cell.
describe('liquidation rows', () => {
  it('renders whichever cell it is handed, untouched', () => {
    const content = buildTakeOrStopConfirmContent(
      params({
        liqPriceCell: LIQ_PRICE_CELL,
        liqDistanceCell: LIQ_DISTANCE_CELL,
      })
    );

    expect(rowValue(content, 'estLiqPrice')).toBe(LIQ_PRICE_CELL);
    expect(rowValue(content, 'estLiqDistance')).toBe(LIQ_DISTANCE_CELL);
  });

  it('leaves out each row whose cell is missing', () => {
    const priceOnly = buildTakeOrStopConfirmContent(
      params({ liqPriceCell: LIQ_PRICE_CELL })
    );
    expect(rowValue(priceOnly, 'estLiqPrice')).toBe(LIQ_PRICE_CELL);
    expect(rowValue(priceOnly, 'estLiqDistance')).toBeUndefined();

    const distanceOnly = buildTakeOrStopConfirmContent(
      params({ liqDistanceCell: LIQ_DISTANCE_CELL })
    );
    expect(rowValue(distanceOnly, 'estLiqPrice')).toBeUndefined();
    expect(rowValue(distanceOnly, 'estLiqDistance')).toBe(LIQ_DISTANCE_CELL);
  });

  it('leaves both out when neither cell is passed', () => {
    const content = buildTakeOrStopConfirmContent(params());

    expect(rowValue(content, 'estLiqPrice')).toBeUndefined();
    expect(rowValue(content, 'estLiqDistance')).toBeUndefined();
  });
});
