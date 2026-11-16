import type {
  OpenOrder,
  SpotAssetCtx,
  SpotClearinghouseState,
  SpotMeta,
} from '@rabby-wallet/hyperliquid-sdk';
import BigNumber from 'bignumber.js';

// Hyperliquid spot pairs are addressed as asset id 10000 + universe index. The
// pair's market key (mids, l2Book, open orders) is its universe `name`: the
// canonical PURR pair is 'PURR/USDC', every other pair is '@<index>'.
export const SPOT_ASSET_ID_OFFSET = 10000;
// Hyperliquid rejects spot orders below 10 units of the quote token.
export const SPOT_MIN_ORDER_NOTIONAL = 10;
// Spot prices allow at most 8 - szDecimals decimals and 5 significant figures.
export const SPOT_MAX_PRICE_DECIMALS = 8;
export const SPOT_MAX_SIG_FIGS = 5;
// Market orders are sent as IOC limit orders crossing the mid by this ratio.
export const SPOT_MARKET_SLIPPAGE = 0.05;

export type SpotMarket = {
  pairIndex: number;
  /** Market key used by mids, l2Book and open orders ('PURR/USDC' | '@107'). */
  coin: string;
  baseName: string;
  quoteName: string;
  baseTokenIndex: number;
  quoteTokenIndex: number;
  /** Size precision of the base token. */
  szDecimals: number;
  isCanonical: boolean;
  midPx: string | null;
  /** Price 24h ago; null until the pair context has loaded. */
  prevDayPx: string | null;
  /** 24h notional volume in the quote token; null until loaded. */
  dayNtlVlm: string | null;
};

export type SpotBalance = SpotClearinghouseState['balances'][number];

export type SpotOrderSide = 'buy' | 'sell';
export type SpotOrderType = 'market' | 'limit';

export const getSpotMarketDisplayName = (
  market: Pick<SpotMarket, 'baseName' | 'quoteName'>
) => `${market.baseName}/${market.quoteName}`;

const toPositiveOrNull = (value: string | null | undefined) =>
  value != null && Number(value) > 0 ? value : null;

/**
 * Build the market list from the spot universe. Prices come from the pair
 * contexts when given (mid, 24h data), else from the plain mids map.
 */
export const buildSpotMarkets = (
  spotMeta: SpotMeta | null | undefined,
  mids: Record<string, string> | null | undefined,
  ctxs?: SpotAssetCtx[] | null
): SpotMarket[] => {
  if (!spotMeta?.tokens || !spotMeta.universe) {
    return [];
  }
  const tokensByIndex = new Map(
    spotMeta.tokens.map((token) => [token.index, token])
  );
  const ctxByCoin = new Map((ctxs ?? []).map((ctx) => [ctx.coin, ctx]));
  const markets: SpotMarket[] = [];
  for (const pair of spotMeta.universe) {
    const base = tokensByIndex.get(pair.tokens[0]);
    const quote = tokensByIndex.get(pair.tokens[1]);
    if (!base || !quote) {
      continue;
    }
    const ctx = ctxByCoin.get(pair.name);
    markets.push({
      pairIndex: pair.index,
      coin: pair.name,
      baseName: base.name,
      quoteName: quote.name,
      baseTokenIndex: base.index,
      quoteTokenIndex: quote.index,
      // Meta is remote data; a non-integer here would crash BigNumber math.
      szDecimals: Number.isInteger(base.szDecimals)
        ? (base.szDecimals as number)
        : 0,
      isCanonical: !!pair.isCanonical,
      midPx:
        toPositiveOrNull(ctx?.midPx) ??
        toPositiveOrNull(ctx?.markPx) ??
        mids?.[pair.name] ??
        null,
      prevDayPx: toPositiveOrNull(ctx?.prevDayPx),
      dayNtlVlm: ctx?.dayNtlVlm != null ? ctx.dayNtlVlm : null,
    });
  }
  return markets;
};

/** 24h price change as a ratio (0.05 = +5%); null without both prices. */
export const getSpotMarket24hChange = (
  market: Pick<SpotMarket, 'midPx' | 'prevDayPx'>
): number | null => {
  const mid = Number(market.midPx);
  const prev = Number(market.prevDayPx);
  if (!(mid > 0) || !(prev > 0)) {
    return null;
  }
  return mid / prev - 1;
};

export type SpotMarketSort = 'name' | 'volume';

/**
 * Markets that can be traded from the UI: priced pairs, canonical first, then
 * by base name, or by 24h volume (highest first). Unpriced pairs have no
 * liquidity and are dropped.
 */
export const sortSpotMarkets = (
  markets: SpotMarket[],
  sort: SpotMarketSort = 'name'
): SpotMarket[] =>
  markets
    .filter((market) => Number(market.midPx) > 0)
    .sort((a, b) => {
      if (sort === 'volume') {
        const diff = Number(b.dayNtlVlm || 0) - Number(a.dayNtlVlm || 0);
        if (diff !== 0) {
          return diff;
        }
      }
      if (a.isCanonical !== b.isCanonical) {
        return a.isCanonical ? -1 : 1;
      }
      return a.baseName.localeCompare(b.baseName);
    });

export type SpotMarketFilter = 'all' | 'holdings' | 'favorites';

/** Key stored in the shared Perps favorites list for a spot pair. */
export const getSpotFavoriteKey = (market: Pick<SpotMarket, 'coin'>) =>
  `SPOT:${market.coin}`.toUpperCase();

export const isSpotMarketFavorite = (
  favoriteMarkets: ReadonlyArray<string>,
  market: Pick<SpotMarket, 'coin'>
) => {
  const key = getSpotFavoriteKey(market);
  return favoriteMarkets.some((item) => item.toUpperCase() === key);
};

export const filterSpotMarketsByTab = (
  markets: SpotMarket[],
  tab: SpotMarketFilter,
  {
    heldTokenIndexes,
    favoriteMarkets,
  }: {
    heldTokenIndexes: ReadonlySet<number>;
    favoriteMarkets: ReadonlyArray<string>;
  }
): SpotMarket[] => {
  if (tab === 'holdings') {
    return markets.filter((market) =>
      heldTokenIndexes.has(market.baseTokenIndex)
    );
  }
  if (tab === 'favorites') {
    const keys = new Set(favoriteMarkets.map((key) => key.toUpperCase()));
    return markets.filter((market) => keys.has(getSpotFavoriteKey(market)));
  }
  return markets;
};

export const filterSpotMarkets = (
  markets: SpotMarket[],
  query: string
): SpotMarket[] => {
  const q = query.trim().toUpperCase();
  if (!q) {
    return markets;
  }
  return markets.filter(
    (market) =>
      market.baseName.toUpperCase().includes(q) ||
      getSpotMarketDisplayName(market).toUpperCase().includes(q)
  );
};

/** Round a size down to the base token precision. */
export const formatSpotSize = (
  size: BigNumber.Value,
  szDecimals: number
): string => {
  const bn = new BigNumber(size);
  if (!bn.isFinite() || bn.lte(0)) {
    return '0';
  }
  return bn.decimalPlaces(szDecimals, BigNumber.ROUND_DOWN).toFixed();
};

/**
 * Round a price to Hyperliquid spot rules: integers are always valid,
 * otherwise at most 5 significant figures and 8 - szDecimals decimals.
 */
export const formatSpotPrice = (
  price: BigNumber.Value,
  szDecimals: number,
  roundingMode: BigNumber.RoundingMode = BigNumber.ROUND_HALF_UP
): string => {
  const bn = new BigNumber(price);
  if (!bn.isFinite() || bn.lte(0)) {
    return '0';
  }
  const maxDecimals = Math.max(SPOT_MAX_PRICE_DECIMALS - szDecimals, 0);
  const integerDigits = bn.integerValue(BigNumber.ROUND_DOWN).toFixed().length;
  if (bn.gte(1) && integerDigits >= SPOT_MAX_SIG_FIGS) {
    return bn.integerValue(roundingMode).toFixed();
  }
  const sigRounded = bn.precision(SPOT_MAX_SIG_FIGS, roundingMode);
  return sigRounded.decimalPlaces(maxDecimals, roundingMode).toFixed();
};

/** Round a user limit price toward the passive side of the book. */
export const formatSpotLimitPrice = (
  price: BigNumber.Value,
  side: SpotOrderSide,
  szDecimals: number
) =>
  formatSpotPrice(
    price,
    szDecimals,
    side === 'buy' ? BigNumber.ROUND_DOWN : BigNumber.ROUND_UP
  );

/** Limit price used to send a market order as an aggressive IOC. */
export const getSpotMarketOrderPrice = (
  midPx: BigNumber.Value,
  side: SpotOrderSide,
  szDecimals: number,
  slippage = SPOT_MARKET_SLIPPAGE
): string => {
  const mid = new BigNumber(midPx);
  const raw =
    side === 'buy' ? mid.times(1 + slippage) : mid.times(1 - slippage);
  return formatSpotPrice(
    raw,
    szDecimals,
    side === 'buy' ? BigNumber.ROUND_DOWN : BigNumber.ROUND_UP
  );
};

export type SpotOrderValidationError =
  | 'invalidSize'
  | 'invalidPrice'
  | 'belowMinNotional'
  | 'insufficientBalance'
  | 'priceFarFromMarket'
  | 'stalePrice';

// Market orders are refused when the last mid is older than this.
export const SPOT_PRICE_MAX_AGE_MS = 15_000;

export type SpotOrderDraft = {
  side: SpotOrderSide;
  size: string;
  /** Price used for notional and balance checks (mid for market orders). */
  price: string;
  szDecimals: number;
  baseAvailable: BigNumber.Value;
  quoteAvailable: BigNumber.Value;
  /** Current mid; when set, limits crossing it by more than the market
   * slippage are refused and market prices must cross it. */
  midPx?: BigNumber.Value | null;
  orderType?: SpotOrderType;
};

export const validateSpotOrder = (
  draft: SpotOrderDraft
): SpotOrderValidationError | null => {
  const price = new BigNumber(draft.price);
  if (!price.isFinite() || price.lte(0)) {
    return 'invalidPrice';
  }
  const size = new BigNumber(formatSpotSize(draft.size, draft.szDecimals));
  if (!size.isFinite() || size.lte(0)) {
    return 'invalidSize';
  }
  const mid = new BigNumber(draft.midPx ?? NaN);
  if (mid.isFinite() && mid.gt(0)) {
    const isBuy = draft.side === 'buy';
    if (draft.orderType === 'market') {
      // Rounding can push the IOC price back across the mid on very small
      // tick sizes; such an order could never fill.
      if (isBuy ? price.lte(mid) : price.gte(mid)) {
        return 'invalidPrice';
      }
    } else {
      // A limit that crosses the book this far behaves like an uncapped
      // market order on thin spot pairs.
      const bound = mid.times(
        isBuy ? 1 + SPOT_MARKET_SLIPPAGE : 1 - SPOT_MARKET_SLIPPAGE
      );
      if (isBuy ? price.gt(bound) : price.lt(bound)) {
        return 'priceFarFromMarket';
      }
    }
  }
  const notional = size.times(price);
  if (notional.lt(SPOT_MIN_ORDER_NOTIONAL)) {
    return 'belowMinNotional';
  }
  const available =
    draft.side === 'buy'
      ? new BigNumber(draft.quoteAvailable)
      : new BigNumber(draft.baseAvailable);
  const required = draft.side === 'buy' ? notional : size;
  if (!available.isFinite() || available.lt(required)) {
    return 'insufficientBalance';
  }
  return null;
};

/** Largest size the available balance covers at `price`. */
export const getSpotMaxSize = ({
  side,
  price,
  szDecimals,
  baseAvailable,
  quoteAvailable,
}: Omit<SpotOrderDraft, 'size' | 'midPx' | 'orderType'>): string => {
  if (side === 'sell') {
    return formatSpotSize(baseAvailable, szDecimals);
  }
  const px = new BigNumber(price);
  if (!px.isFinite() || px.lte(0)) {
    return '0';
  }
  return formatSpotSize(new BigNumber(quoteAvailable).div(px), szDecimals);
};

export const isSpotOpenOrder = (order: Pick<OpenOrder, 'coin'>) =>
  order.coin.startsWith('@') || order.coin.includes('/');

export type SpotOpenOrderItem = {
  order: OpenOrder;
  market: SpotMarket;
};

/**
 * Open spot orders across all pairs, newest first. Orders whose pair is not
 * in the market list are dropped: without its pair index they can't be
 * cancelled from the app.
 */
export const buildSpotOpenOrderItems = (
  orders: OpenOrder[] | null | undefined,
  markets: SpotMarket[]
): SpotOpenOrderItem[] => {
  if (!orders?.length) {
    return [];
  }
  const marketsByCoin = new Map(markets.map((market) => [market.coin, market]));
  const items: SpotOpenOrderItem[] = [];
  for (const order of orders) {
    const market = marketsByCoin.get(order.coin);
    if (market) {
      items.push({ order, market });
    }
  }
  return items.sort((a, b) => b.order.timestamp - a.order.timestamp);
};

export type SpotTokenBalance = {
  total: string;
  /** Amount locked in open orders. */
  hold: string;
  available: string;
};

const ZERO_BALANCE: SpotTokenBalance = {
  total: '0',
  hold: '0',
  available: '0',
};

export const getSpotTokenBalance = (
  balances: ReadonlyArray<SpotBalance> | null | undefined,
  tokenIndex: number | undefined
): SpotTokenBalance => {
  const balance = balances?.find((item) => item.token === tokenIndex);
  if (!balance) {
    return ZERO_BALANCE;
  }
  const total = new BigNumber(balance.total || 0);
  const hold = new BigNumber(balance.hold || 0);
  const available = total.minus(hold);
  return {
    total: total.gt(0) ? total.toFixed() : '0',
    hold: hold.gt(0) ? hold.toFixed() : '0',
    available: available.gt(0) ? available.toFixed() : '0',
  };
};

/** Token indexes the account holds any amount of. */
export const getSpotHeldTokenIndexes = (
  balances: ReadonlyArray<SpotBalance> | null | undefined
): Set<number> => {
  const held = new Set<number>();
  for (const balance of balances ?? []) {
    if (Number(balance.total) > 0) {
      held.add(balance.token);
    }
  }
  return held;
};

const SPOT_QUOTE_STABLE = 'USDC';

/**
 * USDC price of every priceable spot token, by token index: 1 for USDC, the
 * mid of the token's USDC pair, else its mid on a pair whose quote token is
 * itself priced in USDC (UXPL/USDH through USDH/USDC).
 */
export const getSpotTokenUsdPrices = (
  markets: ReadonlyArray<SpotMarket>
): Map<number, string> => {
  const prices = new Map<number, string>();
  for (const market of markets) {
    if (market.quoteName === SPOT_QUOTE_STABLE) {
      prices.set(market.quoteTokenIndex, '1');
    }
  }
  for (const market of markets) {
    if (
      market.quoteName === SPOT_QUOTE_STABLE &&
      Number(market.midPx) > 0 &&
      !prices.has(market.baseTokenIndex)
    ) {
      prices.set(market.baseTokenIndex, market.midPx as string);
    }
  }
  for (const market of markets) {
    const quotePrice = prices.get(market.quoteTokenIndex);
    if (
      market.quoteName !== SPOT_QUOTE_STABLE &&
      quotePrice &&
      Number(market.midPx) > 0 &&
      !prices.has(market.baseTokenIndex)
    ) {
      prices.set(
        market.baseTokenIndex,
        new BigNumber(market.midPx as string).times(quotePrice).toFixed()
      );
    }
  }
  return prices;
};

export type SpotBalanceItem = {
  balance: SpotBalance;
  /** Pair of the token (its USDC pair first); opens the detail screen. */
  market: SpotMarket | null;
  usdValue: string | null;
};

/** Held balances with their USDC value, largest value first. */
export const buildSpotBalanceItems = (
  balances: ReadonlyArray<SpotBalance> | null | undefined,
  markets: ReadonlyArray<SpotMarket>
): SpotBalanceItem[] => {
  const marketByToken = new Map<number, SpotMarket>();
  for (const market of markets) {
    if (!(Number(market.midPx) > 0)) {
      continue;
    }
    const current = marketByToken.get(market.baseTokenIndex);
    if (
      !current ||
      (market.quoteName === SPOT_QUOTE_STABLE &&
        current.quoteName !== SPOT_QUOTE_STABLE)
    ) {
      marketByToken.set(market.baseTokenIndex, market);
    }
  }
  const usdPrices = getSpotTokenUsdPrices(markets);
  const items: SpotBalanceItem[] = [];
  for (const balance of balances ?? []) {
    if (!(Number(balance.total) > 0)) {
      continue;
    }
    const isStable = balance.coin === SPOT_QUOTE_STABLE;
    const market = isStable ? null : marketByToken.get(balance.token) ?? null;
    const price = isStable ? '1' : usdPrices.get(balance.token) ?? null;
    items.push({
      balance,
      market,
      usdValue: price
        ? new BigNumber(balance.total).times(price).toFixed()
        : null,
    });
  }
  return items.sort(
    (a, b) => Number(b.usdValue ?? -1) - Number(a.usdValue ?? -1)
  );
};

/** Total USDC value of the priced balances. */
export const getSpotPortfolioValue = (
  items: ReadonlyArray<SpotBalanceItem>
): string =>
  items
    .reduce(
      (sum, item) => (item.usdValue ? sum.plus(item.usdValue) : sum),
      new BigNumber(0)
    )
    .toFixed();

/** Filled share of an open order in percent (0-100). */
export const getSpotOrderFillPct = (
  order: Pick<OpenOrder, 'origSz' | 'sz'>
): number => {
  const orig = new BigNumber(order.origSz || 0);
  if (!orig.gt(0)) {
    return 0;
  }
  const pct = orig
    .minus(order.sz || 0)
    .div(orig)
    .times(100)
    .toNumber();
  return Math.min(100, Math.max(0, pct));
};

/** Signed distance of a limit price from the mid, as a ratio. */
export const getSpotOrderDistanceFromMid = (
  order: Pick<OpenOrder, 'limitPx'>,
  midPx: string | null
): number | null => {
  const limit = Number(order.limitPx);
  const mid = Number(midPx);
  if (!(limit > 0) || !(mid > 0)) {
    return null;
  }
  return limit / mid - 1;
};

export type SpotOpenOrderGroup = {
  market: SpotMarket;
  orders: OpenOrder[];
};

/** Open orders grouped by pair, groups in order of their newest order. */
export const groupSpotOpenOrders = (
  items: ReadonlyArray<SpotOpenOrderItem>
): SpotOpenOrderGroup[] => {
  const groups = new Map<string, SpotOpenOrderGroup>();
  for (const item of items) {
    const group = groups.get(item.market.coin);
    if (group) {
      group.orders.push(item.order);
    } else {
      groups.set(item.market.coin, {
        market: item.market,
        orders: [item.order],
      });
    }
  }
  return Array.from(groups.values());
};

export type SpotAmountUnit = 'base' | 'quote';

/**
 * Base size for an amount typed in `unit`. Quote amounts are converted at
 * `price` and rounded down to the base precision; a missing price gives '0'.
 */
export const getSpotSizeFromAmount = ({
  amount,
  unit,
  price,
  szDecimals,
}: {
  amount: string;
  unit: SpotAmountUnit;
  price: string | null;
  szDecimals: number;
}): string => {
  if (unit === 'base') {
    return formatSpotSize(amount || 0, szDecimals);
  }
  const px = new BigNumber(price ?? NaN);
  if (!px.isFinite() || px.lte(0)) {
    return '0';
  }
  return formatSpotSize(new BigNumber(amount || 0).div(px), szDecimals);
};

/**
 * Price an amount typed in `unit` is converted to a base size at. Market buys
 * typed in the quote token convert at the IOC limit, so the typed amount caps
 * the spend even if the order fills at the worst allowed price. Other market
 * orders convert at the mid, limit orders at their limit.
 */
export const getSpotAmountConversionPrice = ({
  orderType,
  side,
  unit,
  midPx,
  orderPrice,
}: {
  orderType: SpotOrderType;
  side: SpotOrderSide;
  unit: SpotAmountUnit;
  midPx: string | null;
  /** Price the order is signed at: the IOC limit or the rounded limit. */
  orderPrice: string;
}): string | null => {
  const hasOrderPrice = Number(orderPrice) > 0;
  if (orderType === 'limit' || (side === 'buy' && unit === 'quote')) {
    return hasOrderPrice ? orderPrice : null;
  }
  return Number(midPx) > 0 ? midPx : null;
};

/** Quote-side maximum: the quote balance for buys, base value for sells. */
export const getSpotMaxQuoteAmount = ({
  side,
  price,
  baseAvailable,
  quoteAvailable,
}: {
  side: SpotOrderSide;
  /** Conversion price (the mid for market orders, else the limit). */
  price: string | null;
  baseAvailable: BigNumber.Value;
  quoteAvailable: BigNumber.Value;
}): string => {
  if (side === 'buy') {
    // Quote buys convert at the signed price, so the whole balance is usable.
    return formatSpotQuoteAmount(quoteAvailable);
  }
  const px = new BigNumber(price ?? NaN);
  if (!px.isFinite() || px.lte(0)) {
    return '0';
  }
  return formatSpotQuoteAmount(new BigNumber(baseAvailable).times(px));
};

/** Round a quote amount down to cents, without trailing zeros. */
export const formatSpotQuoteAmount = (value: BigNumber.Value): string => {
  const bn = new BigNumber(value);
  if (!bn.isFinite() || bn.lte(0)) {
    return '0';
  }
  return bn.decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed();
};

export type SpotCancelIntent = { pairIndex: number; oid: number };

/**
 * Cancel targets go straight into a signed action: drop duplicates and
 * refuse ids or pair indexes that are not non-negative safe integers.
 */
export const normalizeSpotCancelIntents = (
  intents: ReadonlyArray<SpotCancelIntent>
): SpotCancelIntent[] => {
  const seen = new Set<number>();
  const result: SpotCancelIntent[] = [];
  for (const intent of intents) {
    if (
      !Number.isSafeInteger(intent.oid) ||
      intent.oid < 0 ||
      !Number.isSafeInteger(intent.pairIndex) ||
      intent.pairIndex < 0
    ) {
      throw new Error('Invalid spot cancel order');
    }
    if (!seen.has(intent.oid)) {
      seen.add(intent.oid);
      result.push({ pairIndex: intent.pairIndex, oid: intent.oid });
    }
  }
  if (!result.length) {
    throw new Error('At least one spot order is required');
  }
  return result;
};
