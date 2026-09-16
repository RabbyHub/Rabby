/**
 * Hyperliquid portfolio series helpers (pure functions only).
 *
 * The `{"type":"portfolio"}` info request — issued via
 * `sdk.info.getPortfolio()` — returns 8 [period, series] pairs:
 * day/week/month/allTime plus perp-prefixed variants. Only the un-prefixed
 * combined series (spot + perps, the official-site Total Equity basis) are
 * kept here.
 */

export type PortfolioPeriodKey = 'day' | 'week' | 'month' | 'allTime';

export type PortfolioSeries = {
  /** [msTimestamp, value] pairs, last point is near-realtime (0~4min old) */
  accountValueHistory: [number, string][];
  /** [msTimestamp, cumulativePnl] pairs */
  pnlHistory: [number, string][];
  vlm: string;
};

export type PortfolioData = Partial<
  Record<PortfolioPeriodKey, PortfolioSeries>
>;

export type PortfolioChartPoint = { timestamp: number; value: number };

export const PORTFOLIO_PERIOD_KEYS: PortfolioPeriodKey[] = [
  'day',
  'week',
  'month',
  'allTime',
];

const toTuples = (value: unknown): [number, string][] => {
  if (!Array.isArray(value)) return [];
  const tuples: [number, string][] = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const ts = Number(point[0]);
    if (!Number.isFinite(ts)) continue;
    tuples.push([ts, String(point[1])]);
  }
  return tuples;
};

export const parsePortfolioResponse = (raw: unknown): PortfolioData => {
  const data: PortfolioData = {};
  if (!Array.isArray(raw)) return data;
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [period, seriesRaw] = entry;
    if (!PORTFOLIO_PERIOD_KEYS.includes(period as PortfolioPeriodKey)) continue;
    if (!seriesRaw || typeof seriesRaw !== 'object') continue;
    const record = seriesRaw as Record<string, unknown>;
    if (!Array.isArray(record.accountValueHistory)) continue;
    data[period as PortfolioPeriodKey] = {
      accountValueHistory: toTuples(record.accountValueHistory),
      pnlHistory: toTuples(record.pnlHistory),
      vlm: String(record.vlm ?? '0'),
    };
  }
  return data;
};

/**
 * An account with no history returns non-empty arrays whose values are all
 * "0.0" — emptiness must be judged by value, not by array length.
 */
export const isPortfolioAllZero = (data: PortfolioData): boolean => {
  for (const key of PORTFOLIO_PERIOD_KEYS) {
    const s = data[key];
    if (!s) continue;
    for (const [, value] of s.accountValueHistory) {
      if (Number(value) !== 0) return false;
    }
  }
  return true;
};

export const getLatestPortfolioValue = (data: PortfolioData): number | null => {
  for (const key of PORTFOLIO_PERIOD_KEYS) {
    const history = data[key]?.accountValueHistory;
    if (history?.length) {
      const value = Number(history[history.length - 1][1]);
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
};

/**
 * 24H change comes from pnlHistory (last - first). accountValueHistory
 * first/last deltas are distorted by deposits/withdrawals/transfers (verified
 * 2026-08-11: a transfer made AV read as -54% while actual pnl was -0.44).
 * Denominator = current PV - pnl (the flow-adjusted value 24h ago).
 *
 * Known limit: when the `day` series is missing entirely (as opposed to
 * present with <2 points), pnl is 0 and the percentage computes as a real
 * 0% off whatever period getLatestPortfolioValue falls back to. Kept as-is
 * to match mobile; the portfolio endpoint returns all periods together, so
 * this only surfaces on a partially malformed response.
 */
export const compute24hChange = (
  data: PortfolioData
): { pnl: number; percent: number | null } => {
  const pnlHistory = data.day?.pnlHistory;
  let pnl = 0;
  if (pnlHistory && pnlHistory.length >= 2) {
    const first = Number(pnlHistory[0][1]);
    const last = Number(pnlHistory[pnlHistory.length - 1][1]);
    if (Number.isFinite(first) && Number.isFinite(last)) pnl = last - first;
  }
  const currentValue = getLatestPortfolioValue(data);
  if (currentValue == null) return { pnl, percent: null };
  const denominator = currentValue - pnl;
  if (denominator <= 0) return { pnl, percent: null };
  return { pnl, percent: pnl / denominator };
};

export const toChartPoints = (
  series: PortfolioSeries | undefined
): PortfolioChartPoint[] => {
  if (!series) return [];
  return series.accountValueHistory.map(([timestamp, value]) => {
    // `|| 0` alone would let Infinity through and wreck the chart's y-scale;
    // match the isFinite guard the other readers of this series use.
    const parsed = Number(value);
    return {
      timestamp,
      value: Number.isFinite(parsed) ? parsed : 0,
    };
  });
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Tooltip time, identical for every period, device local time:
 * "Aug 25, 14:00" — points from a previous year lead with it:
 * "2025 Aug 25, 14:00".
 */
export const formatPortfolioTooltipTime = (
  ts: number,
  now: Date = new Date()
): string => {
  const d = new Date(ts);
  const year = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()} `;
  return `${year}${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
};

/**
 * Guards against a malformed 200 that parses to nothing at all — throw so
 * callers retry / keep prior data instead of rendering a fake empty account.
 *
 * Note this only catches a TOTAL parse failure. A response that yields some
 * but not all four periods is passed through: callers must tolerate a missing
 * period rather than assume all four are present.
 */
export const parsePortfolioResponseStrict = (raw: unknown): PortfolioData => {
  const data = parsePortfolioResponse(raw);
  if (!Object.keys(data).length) {
    throw new Error('[perpsPortfolio] malformed response body');
  }
  return data;
};
