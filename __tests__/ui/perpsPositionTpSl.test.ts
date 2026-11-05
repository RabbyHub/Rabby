import type { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import {
  PositionTpSlOrder,
  TpSlCalcContext,
  TpSlCommand,
  calcTpSlPnl,
  calcTpSlRoi,
  calcTriggerFromModeValue,
  calculateTpSlCoverage,
  collectPositionTpSlOrders,
  findNearestTpSlOrder,
  findPlacedPartialTpSlLegs,
  formatTpSlAmount,
  getTpSlMaxAmountInput,
  groupTpSlOrders,
  isSameTriggerPrice,
  isTpSlCommandStale,
  normalizeTriggerPrice,
  resolvePartialTpSlSize,
  resolveTpSlSideView,
  sortTpSlOrders,
  validatePartialTpSlTrigger,
  validatePositionTpSlTrigger,
} from '@/ui/views/DesktopPerps/positionTpSl';

const makeOrder = (patch: Partial<OpenOrder>): OpenOrder => ({
  coin: 'BTC',
  side: 'A',
  limitPx: '0',
  sz: '0.5',
  oid: 1,
  timestamp: 1,
  triggerCondition: '',
  isTrigger: true,
  triggerPx: '70000',
  isPositionTpsl: false,
  reduceOnly: true,
  orderType: 'Take Profit Market',
  origSz: '0.5',
  tif: null,
  ...patch,
});

const makeTpSl = (patch: Partial<PositionTpSlOrder>): PositionTpSlOrder => ({
  oid: 1,
  kind: 'takeProfit',
  scope: 'partial',
  triggerPrice: '100',
  remainingSize: '1',
  timestamp: 1,
  ...patch,
});

const LONG_BTC = { coin: 'BTC', direction: 'Long' as const };

describe('collectPositionTpSlOrders', () => {
  it('keeps reduce-only trigger orders on the closing side and classifies their scope', () => {
    const orders = collectPositionTpSlOrders(
      [
        makeOrder({ oid: 1 }),
        makeOrder({
          oid: 2,
          orderType: 'Stop Market',
          triggerPx: '60000',
          sz: '0',
          isPositionTpsl: true,
        }),
      ],
      LONG_BTC
    );
    expect(orders).toEqual([
      {
        oid: 1,
        kind: 'takeProfit',
        scope: 'partial',
        triggerPrice: '70000',
        remainingSize: '0.5',
        timestamp: 1,
      },
      {
        oid: 2,
        kind: 'stopLoss',
        scope: 'position',
        triggerPrice: '60000',
        remainingSize: '0',
        timestamp: 1,
      },
    ]);
  });

  it('drops orders that do not close this position', () => {
    const orders = collectPositionTpSlOrders(
      [
        makeOrder({ oid: 1, side: 'B' }),
        makeOrder({ oid: 2, reduceOnly: false }),
        makeOrder({ oid: 3, coin: 'ETH' }),
        makeOrder({ oid: 4, isTrigger: false, orderType: 'Limit' }),
        makeOrder({ oid: 5, sz: '0' }),
        makeOrder({ oid: 6, triggerPx: '0' }),
        makeOrder({ oid: 7, orderType: 'Limit', triggerCondition: 'N/A' }),
      ],
      LONG_BTC
    );
    expect(orders).toEqual([]);
  });

  it('uses the buy side for a short position', () => {
    const orders = collectPositionTpSlOrders(
      [makeOrder({ oid: 1, side: 'B' }), makeOrder({ oid: 2, side: 'A' })],
      { coin: 'BTC', direction: 'Short' }
    );
    expect(orders.map((o) => o.oid)).toEqual([1]);
  });

  it('falls back to the trigger condition to tell take profit from stop loss', () => {
    const [order] = collectPositionTpSlOrders(
      [
        makeOrder({
          orderType: 'Trigger',
          triggerCondition: 'Stop loss when price below 60000',
        }),
      ],
      LONG_BTC
    );
    expect(order.kind).toBe('stopLoss');
  });

  it('excludes limit trigger orders (only market triggers count)', () => {
    const orders = collectPositionTpSlOrders(
      [
        makeOrder({ oid: 1, orderType: 'Take Profit Limit' }),
        makeOrder({ oid: 2, orderType: 'Stop Limit', triggerPx: '60000' }),
        makeOrder({ oid: 3, orderType: 'Stop Market', triggerPx: '60000' }),
      ],
      LONG_BTC
    );
    expect(orders.map((o) => o.oid)).toEqual([3]);
  });

  it('ignores TP/SL children that still hang off an unfilled parent order', () => {
    const child = makeOrder({ oid: 9 });
    const parent = makeOrder({
      oid: 8,
      side: 'B',
      reduceOnly: false,
      isTrigger: false,
      orderType: 'Limit',
      children: [child],
    });
    expect(collectPositionTpSlOrders([parent, child], LONG_BTC)).toEqual([]);
  });
});

describe('sortTpSlOrders', () => {
  const orders = [
    makeTpSl({ oid: 1, triggerPrice: '70000', timestamp: 3 }),
    makeTpSl({ oid: 2, triggerPrice: '72000', timestamp: 2 }),
    makeTpSl({ oid: 3, triggerPrice: '71000', timestamp: 1 }),
    makeTpSl({ oid: 4, triggerPrice: '71000', timestamp: 0 }),
  ];

  it('orders a long from the highest trigger down, older first on ties', () => {
    expect(sortTpSlOrders(orders, 'Long').map((o) => o.oid)).toEqual([
      2,
      4,
      3,
      1,
    ]);
  });

  it('orders a short from the lowest trigger up, older first on ties', () => {
    expect(sortTpSlOrders(orders, 'Short').map((o) => o.oid)).toEqual([
      1,
      4,
      3,
      2,
    ]);
  });
});

describe('groupTpSlOrders', () => {
  it('splits one scope into sorted take-profit and stop-loss groups', () => {
    const groups = groupTpSlOrders(
      [
        makeTpSl({ oid: 1, kind: 'takeProfit', triggerPrice: '110' }),
        makeTpSl({ oid: 2, kind: 'takeProfit', triggerPrice: '120' }),
        makeTpSl({ oid: 3, kind: 'stopLoss', triggerPrice: '90' }),
        makeTpSl({
          oid: 4,
          kind: 'stopLoss',
          scope: 'position',
          triggerPrice: '80',
        }),
      ],
      'partial',
      'Long'
    );
    expect(groups.takeProfit.map((o) => o.oid)).toEqual([2, 1]);
    expect(groups.stopLoss.map((o) => o.oid)).toEqual([3]);
  });
});

describe('findNearestTpSlOrder', () => {
  it('picks the trigger closest to the mark price', () => {
    const nearest = findNearestTpSlOrder(
      [
        makeTpSl({ oid: 1, triggerPrice: '70000' }),
        makeTpSl({ oid: 2, triggerPrice: '71200' }),
      ],
      '70500'
    );
    expect(nearest?.oid).toBe(1);
  });

  it('breaks a distance tie by the newer order, then the lower oid', () => {
    const nearest = findNearestTpSlOrder(
      [
        makeTpSl({ oid: 3, triggerPrice: '70000', timestamp: 1 }),
        makeTpSl({ oid: 2, triggerPrice: '71000', timestamp: 2 }),
        makeTpSl({ oid: 1, triggerPrice: '71000', timestamp: 2 }),
      ],
      70500
    );
    expect(nearest?.oid).toBe(1);
  });

  it('returns null without a mark price', () => {
    expect(findNearestTpSlOrder([makeTpSl({})], 0)).toBeNull();
  });
});

describe('calculateTpSlCoverage', () => {
  it('sums unfilled sizes over the position without capping at 100%', () => {
    expect(
      calculateTpSlCoverage(
        [
          makeTpSl({ remainingSize: '0.5' }),
          makeTpSl({ remainingSize: '1.5' }),
        ],
        '1'
      )
    ).toBe(200);
  });

  it('returns null for an empty position', () => {
    expect(calculateTpSlCoverage([makeTpSl({})], '0')).toBeNull();
  });
});

describe('PnL and ROI', () => {
  it('computes PnL in the direction of the position', () => {
    expect(
      calcTpSlPnl({
        direction: 'Long',
        entryPrice: '100',
        triggerPrice: '110',
        size: '2',
      })?.toNumber()
    ).toBe(20);
    expect(
      calcTpSlPnl({
        direction: 'Short',
        entryPrice: '100',
        triggerPrice: '110',
        size: '2',
      })?.toNumber()
    ).toBe(-20);
  });

  it('computes ROI on margin', () => {
    expect(
      calcTpSlRoi({
        direction: 'Long',
        entryPrice: '100',
        triggerPrice: '110',
        leverage: 10,
      })?.toNumber()
    ).toBe(100);
    expect(
      calcTpSlRoi({
        direction: 'Short',
        entryPrice: '100',
        triggerPrice: '95',
        leverage: 10,
      })?.toNumber()
    ).toBe(50);
  });
});

describe('calcTriggerFromModeValue', () => {
  const base = { entryPrice: '100', size: '2', leverage: 10, szDecimals: 2 };

  it.each([
    ['Long', 'takeProfit', '110'],
    ['Long', 'stopLoss', '90'],
    ['Short', 'takeProfit', '90'],
    ['Short', 'stopLoss', '110'],
  ] as const)(
    'places a %s %s on the correct side of entry from PnL',
    (direction, kind, expected) => {
      expect(
        calcTriggerFromModeValue({
          ...base,
          direction,
          kind,
          mode: 'pnl',
          value: '20',
        })
      ).toBe(expected);
    }
  );

  it('derives the trigger from ROI on margin', () => {
    expect(
      calcTriggerFromModeValue({
        ...base,
        direction: 'Long',
        kind: 'takeProfit',
        mode: 'roi',
        value: '100',
      })
    ).toBe('110');
    expect(
      calcTriggerFromModeValue({
        ...base,
        direction: 'Short',
        kind: 'stopLoss',
        mode: 'roi',
        value: '50',
      })
    ).toBe('105');
  });

  it('puts a zero target (break-even) at the entry price', () => {
    expect(
      calcTriggerFromModeValue({
        ...base,
        direction: 'Long',
        kind: 'stopLoss',
        mode: 'pnl',
        value: '0',
      })
    ).toBe('100');
    expect(
      calcTriggerFromModeValue({
        ...base,
        direction: 'Short',
        kind: 'takeProfit',
        mode: 'roi',
        value: '0',
      })
    ).toBe('100');
  });

  describe('a target smaller than one price step (70M DOGE short)', () => {
    const doge = {
      entryPrice: '0.094616',
      size: '70772338',
      leverage: 3,
      szDecimals: 0,
    };

    it.each([
      ['Short', 'stopLoss'],
      ['Short', 'takeProfit'],
      ['Long', 'stopLoss'],
      ['Long', 'takeProfit'],
    ] as const)('keeps a %s %s on the entry price', (direction, kind) => {
      expect(
        calcTriggerFromModeValue({
          ...doge,
          direction,
          kind,
          mode: 'pnl',
          value: '0.01',
        })
      ).toBe('0.094616');
    });

    it('rounds toward entry, never past the typed PnL', () => {
      // 100 / 70,772,338 = 0.0000014 -> one 0.000001 step from entry.
      expect(
        calcTriggerFromModeValue({
          ...doge,
          direction: 'Short',
          kind: 'stopLoss',
          mode: 'pnl',
          value: '100',
        })
      ).toBe('0.094617');
      expect(
        calcTriggerFromModeValue({
          ...doge,
          direction: 'Short',
          kind: 'takeProfit',
          mode: 'pnl',
          value: '100',
        })
      ).toBe('0.094615');
    });
  });

  it('keeps any integer price above 5 significant figures', () => {
    expect(
      calcTriggerFromModeValue({
        entryPrice: '123456',
        size: '1',
        leverage: 10,
        szDecimals: 5,
        direction: 'Long',
        kind: 'takeProfit',
        mode: 'pnl',
        value: '100.7',
      })
    ).toBe('123556');
  });

  it('returns an empty trigger when the target needs a non-positive price', () => {
    expect(
      calcTriggerFromModeValue({
        ...base,
        direction: 'Long',
        kind: 'stopLoss',
        mode: 'pnl',
        value: '300',
      })
    ).toBe('');
  });

  it('rounds the derived trigger to a valid Hyperliquid price', () => {
    expect(
      calcTriggerFromModeValue({
        ...base,
        direction: 'Long',
        kind: 'takeProfit',
        mode: 'pnl',
        value: '0.123456',
      })
    ).toBe('100.06');
  });
});

describe('validatePartialTpSlTrigger', () => {
  it.each([
    ['Long', 'takeProfit', '110', null],
    ['Long', 'takeProfit', '105', 'invalidForMark'],
    ['Long', 'stopLoss', '100', null],
    ['Long', 'stopLoss', '106', 'invalidForMark'],
    ['Short', 'takeProfit', '100', null],
    ['Short', 'stopLoss', '104', 'invalidForMark'],
  ] as const)(
    '%s %s at %s against mark 105 -> %s',
    (direction, kind, triggerPrice, expected) => {
      expect(
        validatePartialTpSlTrigger({
          direction,
          kind,
          triggerPrice,
          markPrice: 105,
        })
      ).toBe(expected);
    }
  );

  it('rejects a trigger when the mark price is unavailable', () => {
    expect(
      validatePartialTpSlTrigger({
        direction: 'Long',
        kind: 'takeProfit',
        triggerPrice: '110',
        markPrice: 0,
      })
    ).toBe('invalidForMark');
  });

  it('treats an empty trigger as not yet entered', () => {
    expect(
      validatePartialTpSlTrigger({
        direction: 'Long',
        kind: 'takeProfit',
        triggerPrice: '',
        markPrice: 105,
      })
    ).toBeNull();
  });
});

describe('validatePositionTpSlTrigger', () => {
  it.each([
    ['Long', 'stopLoss', '80', '85', 'stopLossBelowLiquidation'],
    ['Long', 'stopLoss', '101', '85', 'stopLossAboveMark'],
    ['Long', 'takeProfit', '99', '85', 'takeProfitBelowMark'],
    ['Short', 'takeProfit', '101', '115', 'takeProfitAboveMark'],
    ['Short', 'stopLoss', '120', '115', 'stopLossAboveLiquidation'],
    ['Short', 'stopLoss', '99', '115', 'stopLossBelowMark'],
    ['Long', 'takeProfit', '120', '85', null],
    ['Long', 'stopLoss', '90', '85', null],
  ] as const)(
    '%s %s at %s (liq %s, mark 100) -> %s',
    (direction, kind, triggerPrice, liquidationPrice, expected) => {
      expect(
        validatePositionTpSlTrigger({
          direction,
          kind,
          triggerPrice,
          markPrice: 100,
          liquidationPrice,
        })
      ).toBe(expected);
    }
  );
});

describe('resolveTpSlSideView', () => {
  const ctx: TpSlCalcContext = {
    scope: 'partial',
    direction: 'Long',
    entryPrice: '100',
    leverage: 10,
    size: '2',
    szDecimals: 2,
    markPrice: 105,
    liquidationPrice: '85',
  };

  it('derives the trigger from a typed PnL', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'mode', triggerPrice: '', modeValue: '20' },
      'takeProfit',
      ctx
    );
    expect(view.triggerPrice).toBe('110');
    expect(view.status).toBe('valid');
    expect(view.pnl?.toNumber()).toBe(20);
    expect(view.roi?.toNumber()).toBe(100);
  });

  it('accepts a typed 0 as a break-even target at the entry price', () => {
    const view = resolveTpSlSideView(
      { mode: 'roi', source: 'mode', triggerPrice: '', modeValue: '0' },
      'stopLoss',
      ctx
    );
    expect(view).toMatchObject({
      triggerPrice: '100',
      status: 'valid',
      error: null,
    });
    expect(view.pnl?.toNumber()).toBe(0);
    expect(view.roi?.toNumber()).toBe(0);
  });

  it('reads a trigger at the entry price as a 0 target', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'trigger', triggerPrice: '100', modeValue: '' },
      'stopLoss',
      ctx
    );
    expect(view.modeValue).toBe('0');
    expect(view.status).toBe('valid');
  });

  it('estimates from the rounded trigger: a sub-step PnL target reads 0', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'mode', triggerPrice: '', modeValue: '0.01' },
      'stopLoss',
      {
        ...ctx,
        direction: 'Short',
        entryPrice: '0.094616',
        leverage: 3,
        size: '70772338',
        szDecimals: 0,
        markPrice: 0.082127,
        liquidationPrice: '2.272245',
      }
    );
    expect(view.triggerPrice).toBe('0.094616');
    expect(view.modeValue).toBe('0.01');
    expect(view.pnl?.toNumber()).toBe(0);
    expect(view.roi?.toNumber()).toBe(0);
    expect(view.status).toBe('valid');
  });

  it('shows nothing for a PnL target when the size is unusable', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'mode', triggerPrice: '', modeValue: '20' },
      'takeProfit',
      { ...ctx, size: '' }
    );
    expect(view).toMatchObject({
      status: 'empty',
      triggerPrice: '',
      error: null,
      pnl: null,
      roi: null,
    });
  });

  it('still derives the trigger of an ROI target when the size is unusable', () => {
    const view = resolveTpSlSideView(
      { mode: 'roi', source: 'mode', triggerPrice: '', modeValue: '100' },
      'takeProfit',
      { ...ctx, size: '' }
    );
    expect(view.triggerPrice).toBe('110');
    expect(view.pnl).toBeNull();
  });

  it('derives the magnitude from a typed trigger in the selected unit', () => {
    const view = resolveTpSlSideView(
      { mode: 'roi', source: 'trigger', triggerPrice: '110', modeValue: '' },
      'takeProfit',
      ctx
    );
    expect(view.modeValue).toBe('100');
    expect(view.pnl?.toNumber()).toBe(20);
  });

  it('rounds the derived magnitude half-up, like the estimated PnL hint', () => {
    // ROI = 0.1225 / 100 * 10 * 100 = 1.225 -> 1.23 (the hint's toFixed(2)),
    // not 1.22; PnL = 0.1225 * 2 = 0.245 -> 0.25.
    const roi = resolveTpSlSideView(
      {
        mode: 'roi',
        source: 'trigger',
        triggerPrice: '100.1225',
        modeValue: '',
      },
      'takeProfit',
      { ...ctx, markPrice: 100.05 }
    );
    expect(roi.modeValue).toBe('1.23');
    expect(roi.modeValue).toBe(roi.roi?.toFixed(2));

    const pnl = resolveTpSlSideView(
      {
        mode: 'pnl',
        source: 'trigger',
        triggerPrice: '100.1225',
        modeValue: '',
      },
      'takeProfit',
      { ...ctx, markPrice: 100.05 }
    );
    expect(pnl.modeValue).toBe('0.25');
    expect(pnl.modeValue).toBe(pnl.pnl?.toFixed(2));
  });

  it('flags a target that has no positive trigger', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'mode', triggerPrice: '', modeValue: '300' },
      'stopLoss',
      ctx
    );
    expect(view).toMatchObject({
      triggerPrice: '',
      status: 'invalid',
      error: 'triggerUnavailable',
    });
  });

  it('flags a trigger on the wrong side of the mark price', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'trigger', triggerPrice: '104', modeValue: '' },
      'takeProfit',
      ctx
    );
    expect(view).toMatchObject({ status: 'invalid', error: 'invalidForMark' });
  });

  it('uses the position rules for a position-scope side', () => {
    const view = resolveTpSlSideView(
      { mode: 'pnl', source: 'trigger', triggerPrice: '80', modeValue: '' },
      'stopLoss',
      { ...ctx, scope: 'position' }
    );
    expect(view.error).toBe('stopLossBelowLiquidation');
  });

  it('reports an untouched side as empty', () => {
    expect(
      resolveTpSlSideView(
        { mode: 'pnl', source: 'trigger', triggerPrice: '', modeValue: '' },
        'stopLoss',
        ctx
      ).status
    ).toBe('empty');
  });
});

describe('partial amount', () => {
  const base = { positionSize: '1.2345', markPrice: 200, szDecimals: 4 };

  it('rounds a slider share of the position down to szDecimals', () => {
    expect(
      resolvePartialTpSlSize({
        ...base,
        source: 'slider',
        percent: 50,
        amountInput: '',
        unit: 'base',
      })
    ).toBe('0.6172');
    expect(
      resolvePartialTpSlSize({
        ...base,
        source: 'slider',
        percent: 100,
        amountInput: '',
        unit: 'base',
      })
    ).toBe('1.2345');
  });

  it('reads a typed coin amount as is and a typed USD amount at the mark price', () => {
    expect(
      resolvePartialTpSlSize({
        ...base,
        source: 'manual',
        percent: 0,
        amountInput: '0.5',
        unit: 'base',
      })
    ).toBe('0.5');
    expect(
      resolvePartialTpSlSize({
        ...base,
        source: 'manual',
        percent: 0,
        amountInput: '100',
        unit: 'usd',
      })
    ).toBe('0.5');
  });

  it('rejects an empty amount, one above the position, or one that rounds to zero', () => {
    const manual = { ...base, source: 'manual' as const, percent: 0 };
    expect(
      resolvePartialTpSlSize({ ...manual, amountInput: '', unit: 'base' })
    ).toBeNull();
    expect(
      resolvePartialTpSlSize({ ...manual, amountInput: '2', unit: 'base' })
    ).toBeNull();
    expect(
      resolvePartialTpSlSize({
        ...manual,
        amountInput: '0.00001',
        unit: 'base',
      })
    ).toBeNull();
  });

  it('caps typed input at the position in the active unit', () => {
    expect(getTpSlMaxAmountInput({ ...base, unit: 'base' })).toBe('1.2345');
    expect(getTpSlMaxAmountInput({ ...base, unit: 'usd' })).toBe('246.9');
  });

  it('shows an amount in coin, or in USD at the mark price', () => {
    expect(
      formatTpSlAmount({
        unit: 'base',
        size: '0.6172',
        markPrice: 200,
        szDecimals: 4,
      })
    ).toBe('0.6172');
    expect(
      formatTpSlAmount({
        unit: 'usd',
        size: '0.6172',
        markPrice: 200,
        szDecimals: 4,
      })
    ).toBe('123.44');
  });
});

describe('trigger price helpers', () => {
  it('normalizes a stored trigger that breaks the input precision rule', () => {
    expect(normalizeTriggerPrice('69260.0', 5)).toBe('69260');
    expect(normalizeTriggerPrice('110.5', 2)).toBe('110.5');
  });

  it('compares trigger prices numerically', () => {
    expect(isSameTriggerPrice('110', '110.0')).toBe(true);
    expect(isSameTriggerPrice('110', '110.5')).toBe(false);
    expect(isSameTriggerPrice('', '')).toBe(true);
    expect(isSameTriggerPrice('110', '')).toBe(false);
  });
});

describe('findPlacedPartialTpSlLegs', () => {
  const tp = { kind: 'takeProfit' as const, triggerPrice: '110' };
  const sl = { kind: 'stopLoss' as const, triggerPrice: '90' };

  it('finds the leg that landed when the batch threw on the other', () => {
    const orders = [
      makeTpSl({ oid: 1, kind: 'takeProfit', triggerPrice: '120' }),
      makeTpSl({ oid: 7, kind: 'stopLoss', triggerPrice: '90.0' }),
    ];
    expect(findPlacedPartialTpSlLegs([tp, sl], orders, new Set([1]))).toEqual([
      sl,
    ]);
  });

  it('ignores orders that existed before submitting', () => {
    const orders = [
      makeTpSl({ oid: 3, kind: 'takeProfit', triggerPrice: '110' }),
    ];
    expect(findPlacedPartialTpSlLegs([tp], orders, new Set([3]))).toEqual([]);
  });

  it('ignores a new position-scope order at the same trigger', () => {
    const orders = [
      makeTpSl({
        oid: 9,
        kind: 'takeProfit',
        scope: 'position',
        triggerPrice: '110',
      }),
    ];
    expect(findPlacedPartialTpSlLegs([tp], orders, new Set())).toEqual([]);
  });
});

describe('isTpSlCommandStale', () => {
  const live = {
    direction: 'Long' as const,
    markPrice: 100,
    liquidationPrice: '50',
  };
  const leg = (kind: 'takeProfit' | 'stopLoss', triggerPrice: string) => ({
    kind,
    action: 'create' as const,
    triggerPrice,
    size: '1',
    pnl: null,
  });
  const partial = (triggerPrice: string): TpSlCommand => ({
    scope: 'partial',
    direction: 'Long',
    legs: [leg('takeProfit', triggerPrice)],
  });

  it('is stale when the position direction flipped', () => {
    expect(
      isTpSlCommandStale(partial('110'), { ...live, direction: 'Short' })
    ).toBe(true);
  });

  it('is stale when a long partial TP is no longer above the live mark', () => {
    expect(
      isTpSlCommandStale(partial('110'), { ...live, markPrice: 110 })
    ).toBe(true);
  });

  it('is not stale when every trigger still validates', () => {
    expect(isTpSlCommandStale(partial('110'), live)).toBe(false);
  });

  it('is stale when a position SL is at or below liquidation', () => {
    const command: TpSlCommand = {
      scope: 'position',
      direction: 'Long',
      legs: [leg('stopLoss', '60')],
    };
    expect(isTpSlCommandStale(command, live)).toBe(false);
    expect(
      isTpSlCommandStale(command, { ...live, liquidationPrice: '60' })
    ).toBe(true);
  });
});
