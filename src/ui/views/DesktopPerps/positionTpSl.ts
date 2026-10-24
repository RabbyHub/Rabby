import BigNumber from 'bignumber.js';
import type { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import { formatTpOrSlPrice, validatePriceInput } from '../Perps/pricePrecision';

/**
 * Rules for the TP/SL orders that sit on an open position: which open orders
 * belong to it, how they are grouped and ordered, and how a trigger price
 * converts to and from an estimated PnL / ROI.
 *
 * Ported from rabby-mobile `screens/PerpsPro/model/positionTpSl.ts`. Kept free
 * of React, i18n and the store (and in its own leaf module) so every rule is
 * unit-testable.
 */

export type TpSlKind = 'takeProfit' | 'stopLoss';
/** `partial`: fixed-size order. `position`: follows the whole position. */
export type TpSlScope = 'partial' | 'position';
export type TpSlDirection = 'Long' | 'Short';
export type TpSlInputMode = 'pnl' | 'roi';
export type TpSlAmountUnit = 'base' | 'usd';

type Numeric = string | number;

export interface PositionTpSlOrder {
  oid: number;
  kind: TpSlKind;
  scope: TpSlScope;
  triggerPrice: string;
  /** Unfilled size in coin; `'0'` for a position-scope order. */
  remainingSize: string;
  timestamp: number;
}

export interface TpSlOrderGroups {
  takeProfit: PositionTpSlOrder[];
  stopLoss: PositionTpSlOrder[];
}

const positive = (value?: Numeric | null): BigNumber | null => {
  if (value === undefined || value === null || value === '') return null;
  const bn = new BigNumber(value);
  return bn.isFinite() && bn.gt(0) ? bn : null;
};

/** A typed PnL / ROI magnitude: 0 is valid and means break-even. */
const nonNegative = (value?: Numeric | null): BigNumber | null => {
  if (value === undefined || value === null || value === '') return null;
  const bn = new BigNumber(value);
  return bn.isFinite() && bn.gte(0) ? bn : null;
};

const roundDown = (value: BigNumber, decimals: number) =>
  value.decimalPlaces(decimals, BigNumber.ROUND_DOWN);

const kindFromText = (text?: string | null): TpSlKind | null => {
  const lower = (text || '').toLowerCase();
  if (lower.includes('take profit')) return 'takeProfit';
  if (lower.includes('stop')) return 'stopLoss';
  return null;
};

export const resolveTpSlKind = (
  order: Pick<OpenOrder, 'orderType' | 'triggerCondition'>
): TpSlKind | null =>
  kindFromText(order.orderType) ?? kindFromText(order.triggerCondition);

/**
 * Open orders that close this position on a trigger. Children still hanging
 * off an unfilled entry order are skipped — they are not live yet.
 */
export const collectPositionTpSlOrders = (
  openOrders: OpenOrder[],
  position: { coin: string; direction: TpSlDirection }
): PositionTpSlOrder[] => {
  const closingSide = position.direction === 'Long' ? 'A' : 'B';
  const childOids = new Set<number>();
  openOrders.forEach((order) => {
    (order.children || []).forEach((child) => childOids.add(child.oid));
  });

  const result: PositionTpSlOrder[] = [];
  openOrders.forEach((order) => {
    if (order.coin !== position.coin || childOids.has(order.oid)) return;
    if (order.side !== closingSide) return;
    if (!order.reduceOnly || !order.isTrigger) return;
    const kind = resolveTpSlKind(order);
    if (!kind || !positive(order.triggerPx)) return;
    // Only market triggers count; limit triggers stay in Open Orders.
    if ((order.orderType || '').toLowerCase().includes('limit')) return;
    const scope: TpSlScope = order.isPositionTpsl ? 'position' : 'partial';
    if (scope === 'partial' && !positive(order.sz)) return;
    result.push({
      oid: order.oid,
      kind,
      scope,
      triggerPrice: order.triggerPx,
      remainingSize: scope === 'partial' ? order.sz : '0',
      timestamp: order.timestamp,
    });
  });
  return result;
};

/** Long: highest trigger first. Short: lowest first. Ties: older, then lower oid. */
export const sortTpSlOrders = (
  orders: PositionTpSlOrder[],
  direction: TpSlDirection
): PositionTpSlOrder[] =>
  [...orders].sort((a, b) => {
    const diff = new BigNumber(a.triggerPrice).comparedTo(b.triggerPrice) || 0;
    if (diff !== 0) return direction === 'Long' ? -diff : diff;
    return a.timestamp - b.timestamp || a.oid - b.oid;
  });

export const groupTpSlOrders = (
  orders: PositionTpSlOrder[],
  scope: TpSlScope,
  direction: TpSlDirection
): TpSlOrderGroups => {
  const inScope = orders.filter((order) => order.scope === scope);
  return {
    takeProfit: sortTpSlOrders(
      inScope.filter((order) => order.kind === 'takeProfit'),
      direction
    ),
    stopLoss: sortTpSlOrders(
      inScope.filter((order) => order.kind === 'stopLoss'),
      direction
    ),
  };
};

/** Closest trigger to the mark price; ties go to the newer order, then lower oid. */
export const findNearestTpSlOrder = (
  orders: PositionTpSlOrder[],
  markPrice?: Numeric | null
): PositionTpSlOrder | null => {
  const mark = positive(markPrice);
  if (!mark) return null;
  let best: PositionTpSlOrder | null = null;
  let bestDistance: BigNumber | null = null;
  for (const order of orders) {
    const distance = new BigNumber(order.triggerPrice).minus(mark).abs();
    const closer = !best || !bestDistance || distance.lt(bestDistance);
    const winsTie =
      !!best &&
      !!bestDistance &&
      distance.eq(bestDistance) &&
      (order.timestamp > best.timestamp ||
        (order.timestamp === best.timestamp && order.oid < best.oid));
    if (closer || winsTie) {
      best = order;
      bestDistance = distance;
    }
  }
  return best;
};

/** Σ unfilled size ÷ position size, as a percentage. Not capped at 100. */
export const calculateTpSlCoverage = (
  orders: PositionTpSlOrder[],
  positionSize: Numeric
): number | null => {
  const size = positive(positionSize);
  if (!size) return null;
  const total = orders.reduce(
    (sum, order) => sum.plus(order.remainingSize || 0),
    new BigNumber(0)
  );
  return total.div(size).times(100).toNumber();
};

const directionalDelta = (
  direction: TpSlDirection,
  entry: BigNumber,
  trigger: BigNumber
) => (direction === 'Long' ? trigger.minus(entry) : entry.minus(trigger));

export const calcTpSlPnl = (params: {
  direction: TpSlDirection;
  entryPrice: Numeric;
  triggerPrice: Numeric;
  size: Numeric;
}): BigNumber | null => {
  const entry = positive(params.entryPrice);
  const trigger = positive(params.triggerPrice);
  const size = positive(params.size);
  if (!entry || !trigger || !size) return null;
  return directionalDelta(params.direction, entry, trigger).times(size);
};

export const calcTpSlRoi = (params: {
  direction: TpSlDirection;
  entryPrice: Numeric;
  triggerPrice: Numeric;
  leverage: Numeric;
}): BigNumber | null => {
  const entry = positive(params.entryPrice);
  const trigger = positive(params.triggerPrice);
  const leverage = positive(params.leverage);
  if (!entry || !trigger || !leverage) return null;
  return directionalDelta(params.direction, entry, trigger)
    .div(entry)
    .times(leverage)
    .times(100);
};

/** Hyperliquid prices: ≤ 5 significant figures (any integer is allowed). */
const MAX_PRICE_SIGNIFICANT_FIGURES = 5;
/** …and ≤ 6 − szDecimals decimals. */
const MAX_PRICE_DECIMALS = 6;

/**
 * Snap a derived trigger to a valid price, rounding toward the entry price so
 * the PnL it implies never exceeds the typed target. A target closer to entry
 * than one price step lands on the entry price itself (PnL 0) — e.g. a 0.01
 * USDC target on a 70M DOGE position.
 */
const roundTriggerTowardEntry = (
  trigger: BigNumber,
  entry: BigNumber,
  szDecimals: number
) => {
  const mode = trigger.gte(entry) ? BigNumber.ROUND_DOWN : BigNumber.ROUND_UP;
  const integer = trigger.integerValue(mode);
  if (integer.gte(10 ** MAX_PRICE_SIGNIFICANT_FIGURES)) return integer;
  return trigger
    .precision(MAX_PRICE_SIGNIFICANT_FIGURES, mode)
    .decimalPlaces(Math.max(0, MAX_PRICE_DECIMALS - szDecimals), mode);
};

/**
 * Trigger price for a typed PnL / ROI magnitude (0 = the entry price), as a
 * valid price rounded toward entry; `''` when no positive price works.
 */
export const calcTriggerFromModeValue = (params: {
  direction: TpSlDirection;
  kind: TpSlKind;
  mode: TpSlInputMode;
  value: Numeric;
  entryPrice: Numeric;
  size: Numeric;
  leverage: Numeric;
  szDecimals: number;
}): string => {
  const magnitude = nonNegative(params.value);
  const entry = positive(params.entryPrice);
  if (!magnitude || !entry) return '';
  const sign =
    (params.kind === 'takeProfit' ? 1 : -1) *
    (params.direction === 'Long' ? 1 : -1);

  let trigger: BigNumber;
  if (params.mode === 'pnl') {
    const size = positive(params.size);
    if (!size) return '';
    trigger = entry.plus(magnitude.div(size).times(sign));
  } else {
    const leverage = positive(params.leverage);
    if (!leverage) return '';
    trigger = entry.times(
      new BigNumber(1).plus(magnitude.div(leverage).div(100).times(sign))
    );
  }

  if (!trigger.isFinite() || !trigger.gt(0)) return '';
  const rounded = roundTriggerTowardEntry(trigger, entry, params.szDecimals);
  return rounded.gt(0) ? rounded.toFixed() : '';
};

export type TpSlTriggerError =
  | 'triggerUnavailable'
  | 'invalidForMark'
  | 'stopLossBelowLiquidation'
  | 'stopLossAboveLiquidation'
  | 'takeProfitBelowMark'
  | 'takeProfitAboveMark'
  | 'stopLossAboveMark'
  | 'stopLossBelowMark';

/** Partial order: long TP / short SL strictly above the mark, the others strictly below. */
export const validatePartialTpSlTrigger = (params: {
  direction: TpSlDirection;
  kind: TpSlKind;
  triggerPrice: Numeric;
  markPrice: Numeric;
}): TpSlTriggerError | null => {
  const trigger = positive(params.triggerPrice);
  const mark = positive(params.markPrice);
  if (!trigger) return null;
  // Without a mark price the side cannot be checked: fail closed.
  if (!mark) return 'invalidForMark';
  const shouldBeAbove =
    (params.direction === 'Long') === (params.kind === 'takeProfit');
  const ok = shouldBeAbove ? trigger.gt(mark) : trigger.lt(mark);
  return ok ? null : 'invalidForMark';
};

/** Position order: the rules the old EditTpSLModal applied (liquidation first for SL). */
export const validatePositionTpSlTrigger = (params: {
  direction: TpSlDirection;
  kind: TpSlKind;
  triggerPrice: Numeric;
  markPrice: Numeric;
  liquidationPrice: Numeric;
}): TpSlTriggerError | null => {
  const trigger = positive(params.triggerPrice);
  if (!trigger) return null;
  const isLong = params.direction === 'Long';

  if (params.kind === 'stopLoss') {
    const liquidation = positive(params.liquidationPrice);
    if (liquidation) {
      if (isLong && trigger.lte(liquidation)) return 'stopLossBelowLiquidation';
      if (!isLong && trigger.gte(liquidation)) {
        return 'stopLossAboveLiquidation';
      }
    }
  }

  const mark = positive(params.markPrice);
  if (!mark) return null;

  if (params.kind === 'takeProfit') {
    if (isLong && trigger.lte(mark)) return 'takeProfitBelowMark';
    if (!isLong && trigger.gte(mark)) return 'takeProfitAboveMark';
    return null;
  }
  if (isLong && trigger.gte(mark)) return 'stopLossAboveMark';
  if (!isLong && trigger.lte(mark)) return 'stopLossBelowMark';
  return null;
};

/**
 * What the user typed on one side. Only the field they typed is stored; the
 * other field is derived on every render so it follows the amount and price.
 */
export interface TpSlSideDraft {
  mode: TpSlInputMode;
  source: 'trigger' | 'mode';
  triggerPrice: string;
  modeValue: string;
}

export const createEmptyTpSlDraft = (mode: TpSlInputMode): TpSlSideDraft => ({
  mode,
  source: 'trigger',
  triggerPrice: '',
  modeValue: '',
});

export interface TpSlCalcContext {
  scope: TpSlScope;
  direction: TpSlDirection;
  entryPrice: string;
  leverage: number;
  /**
   * Coin size the PnL is computed on: the partial amount, or the whole position.
   * `''` when the partial amount is not usable (empty / zero / over the max).
   */
  size: string;
  szDecimals: number;
  markPrice: Numeric;
  liquidationPrice: string;
}

export type TpSlSideStatus = 'empty' | 'valid' | 'invalid';

export interface TpSlSideView {
  /** Shown in the trigger input; for a valid side, the price to submit. */
  triggerPrice: string;
  /** Unsigned magnitude shown in the PnL / ROI input. */
  modeValue: string;
  pnl: BigNumber | null;
  roi: BigNumber | null;
  status: TpSlSideStatus;
  error: TpSlTriggerError | null;
}

// Half-up, matching the estimated PnL hint (`toFixed(2)`) and mobile, so the
// PnL/ROI input and the hint under it never disagree in the last digit. A
// trigger at the entry price reads `0` (break-even), like a typed 0.
const formatMagnitude = (value: BigNumber | null) => {
  if (!value) return '';
  return value.abs().decimalPlaces(2, BigNumber.ROUND_HALF_UP).toFixed();
};

const validateForScope = (
  kind: TpSlKind,
  triggerPrice: string,
  ctx: TpSlCalcContext
) =>
  ctx.scope === 'partial'
    ? validatePartialTpSlTrigger({
        direction: ctx.direction,
        kind,
        triggerPrice,
        markPrice: ctx.markPrice,
      })
    : validatePositionTpSlTrigger({
        direction: ctx.direction,
        kind,
        triggerPrice,
        markPrice: ctx.markPrice,
        liquidationPrice: ctx.liquidationPrice,
      });

export const resolveTpSlSideView = (
  draft: TpSlSideDraft,
  kind: TpSlKind,
  ctx: TpSlCalcContext
): TpSlSideView => {
  if (draft.source === 'mode') {
    if (!nonNegative(draft.modeValue)) {
      return {
        triggerPrice: '',
        modeValue: draft.modeValue,
        pnl: null,
        roi: null,
        status: 'empty',
        error: null,
      };
    }
    // A PnL target cannot be priced without a size: show nothing, not an error.
    if (draft.mode === 'pnl' && !positive(ctx.size)) {
      return {
        triggerPrice: '',
        modeValue: draft.modeValue,
        pnl: null,
        roi: null,
        status: 'empty',
        error: null,
      };
    }
    const triggerPrice = calcTriggerFromModeValue({
      direction: ctx.direction,
      kind,
      mode: draft.mode,
      value: draft.modeValue,
      entryPrice: ctx.entryPrice,
      size: ctx.size,
      leverage: ctx.leverage,
      szDecimals: ctx.szDecimals,
    });
    const error: TpSlTriggerError | null = triggerPrice
      ? validateForScope(kind, triggerPrice, ctx)
      : 'triggerUnavailable';
    // Estimate from the rounded trigger that will be submitted, like mobile:
    // price precision can make it differ from the typed target (down to 0).
    return {
      triggerPrice,
      modeValue: draft.modeValue,
      pnl: calcTpSlPnl({
        direction: ctx.direction,
        entryPrice: ctx.entryPrice,
        triggerPrice,
        size: ctx.size,
      }),
      roi: calcTpSlRoi({
        direction: ctx.direction,
        entryPrice: ctx.entryPrice,
        triggerPrice,
        leverage: ctx.leverage,
      }),
      status: error ? 'invalid' : 'valid',
      error,
    };
  }

  if (!positive(draft.triggerPrice)) {
    return {
      triggerPrice: draft.triggerPrice,
      modeValue: '',
      pnl: null,
      roi: null,
      status: 'empty',
      error: null,
    };
  }
  const pnl = calcTpSlPnl({
    direction: ctx.direction,
    entryPrice: ctx.entryPrice,
    triggerPrice: draft.triggerPrice,
    size: ctx.size,
  });
  const roi = calcTpSlRoi({
    direction: ctx.direction,
    entryPrice: ctx.entryPrice,
    triggerPrice: draft.triggerPrice,
    leverage: ctx.leverage,
  });
  const error = validateForScope(kind, draft.triggerPrice, ctx);
  return {
    triggerPrice: draft.triggerPrice,
    modeValue: formatMagnitude(draft.mode === 'pnl' ? pnl : roi),
    pnl,
    roi,
    status: error ? 'invalid' : 'valid',
    error,
  };
};

/** Largest value the amount input accepts, in the active unit. */
export const getTpSlMaxAmountInput = (params: {
  unit: TpSlAmountUnit;
  positionSize: Numeric;
  markPrice: Numeric;
  szDecimals: number;
}): string => {
  const size = positive(params.positionSize);
  if (!size) return '0';
  if (params.unit === 'base')
    return roundDown(size, params.szDecimals).toFixed();
  const mark = positive(params.markPrice);
  return mark ? roundDown(size.times(mark), 2).toFixed() : '0';
};

/** A coin size shown in the active unit (USD at the mark price). No separators. */
export const formatTpSlAmount = (params: {
  unit: TpSlAmountUnit;
  size: Numeric;
  markPrice: Numeric;
  szDecimals: number;
}): string => {
  const size = new BigNumber(params.size || 0);
  if (!size.isFinite()) return '0';
  if (params.unit === 'base')
    return roundDown(size, params.szDecimals).toFixed();
  const mark = positive(params.markPrice);
  return mark ? roundDown(size.times(mark), 2).toFixed(2) : '0.00';
};

/** Coin size a partial order will be placed with; `null` when the amount is not usable. */
export const resolvePartialTpSlSize = (params: {
  source: 'slider' | 'manual';
  percent: number;
  amountInput: string;
  unit: TpSlAmountUnit;
  positionSize: Numeric;
  markPrice: Numeric;
  szDecimals: number;
}): string | null => {
  const positionSize = positive(params.positionSize);
  if (!positionSize) return null;

  let raw: BigNumber | null;
  if (params.source === 'slider') {
    raw = positionSize.times(params.percent).div(100);
  } else if (params.unit === 'base') {
    raw = positive(params.amountInput);
  } else {
    const amount = positive(params.amountInput);
    const mark = positive(params.markPrice);
    raw = amount && mark ? amount.div(mark) : null;
  }
  if (!raw) return null;

  const size = roundDown(raw, params.szDecimals);
  if (!size.gt(0) || size.gt(positionSize)) return null;
  return size.toFixed();
};

/** A stored trigger in a form the trigger input accepts (e.g. `69260.0` -> `69260`). */
export const normalizeTriggerPrice = (price: string, szDecimals: number) =>
  validatePriceInput(price, szDecimals)
    ? price
    : formatTpOrSlPrice(Number(price), szDecimals);

export const isSameTriggerPrice = (a?: string, b?: string) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = new BigNumber(a);
  const right = new BigNumber(b);
  if (left.isNaN() || right.isNaN()) return a === b;
  return left.eq(right);
};

/**
 * The created partial legs that now exist as orders: a new oid (not in
 * `knownOids`, the orders before submitting) of the same side and trigger.
 * Used when a batch call threw on one leg and the other may have landed.
 */
export const findPlacedPartialTpSlLegs = <
  L extends Pick<TpSlCommandLeg, 'kind' | 'triggerPrice'>
>(
  legs: L[],
  orders: PositionTpSlOrder[],
  knownOids: Set<number>
): L[] =>
  legs.filter((leg) =>
    orders.some(
      (order) =>
        order.scope === 'partial' &&
        order.kind === leg.kind &&
        !knownOids.has(order.oid) &&
        isSameTriggerPrice(order.triggerPrice, leg.triggerPrice)
    )
  );

export interface TpSlCommandLeg {
  kind: TpSlKind;
  action: 'create' | 'modify';
  /** Order being modified. */
  oid?: number;
  triggerPrice: string;
  /** Coin size for a partial leg; `null` for a position leg (it follows the position). */
  size: string | null;
  /** Estimated PnL at the trigger, for the confirmation page. */
  pnl: BigNumber | null;
}

export interface TpSlCommand {
  scope: TpSlScope;
  /** Direction of the position the command was built for. */
  direction: TpSlDirection;
  legs: TpSlCommandLeg[];
}

/**
 * True when the position or mark moved since the command was built: the
 * direction flipped, or a leg's trigger no longer passes its scope's rules.
 */
export const isTpSlCommandStale = (
  command: TpSlCommand,
  live: {
    direction: TpSlDirection;
    markPrice: Numeric;
    liquidationPrice: string;
  }
): boolean => {
  if (command.direction !== live.direction) return true;
  return command.legs.some((leg) =>
    command.scope === 'partial'
      ? validatePartialTpSlTrigger({
          direction: live.direction,
          kind: leg.kind,
          triggerPrice: leg.triggerPrice,
          markPrice: live.markPrice,
        }) !== null
      : validatePositionTpSlTrigger({
          direction: live.direction,
          kind: leg.kind,
          triggerPrice: leg.triggerPrice,
          markPrice: live.markPrice,
          liquidationPrice: live.liquidationPrice,
        }) !== null
  );
};
