/**
 * Lightweight number formatters local to the widget bundle — the widget is
 * injected into every page, so we deliberately avoid pulling in BigNumber via
 * the main `src/ui/utils/number.ts` helpers.
 */

function withCommas(n: number, fractionDigits: number): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPnl(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n) || n === 0) return '$0.00';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${withCommas(abs, 2)}`;
}

export function formatUsd(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '$0';
  return `$${withCommas(n, 2)}`;
}

export function formatCoinName(coin: string | undefined): string {
  if (coin && coin.includes(':')) {
    // is hip-3 coin
    return coin.split(':')[1];
  } else {
    return coin ?? '';
  }
}

/**
 * Mark price: thousands separator + preserve whatever decimal width the
 * Hyperliquid API returns. We trust the server-side precision rather than
 * normalizing to a fixed width — small-cap coins need many decimals, large-cap
 * very few. Mirrors `splitNumberByStep` semantics without the BigNumber cost.
 */
export function formatMarkPrice(value: string | number): string {
  if (value == null || value === '') return '$0';
  const str = typeof value === 'number' ? value.toString() : value;
  if (!Number.isFinite(Number(str))) return '$0';
  const negative = str.startsWith('-');
  const abs = negative ? str.slice(1) : str;
  const dotIdx = abs.indexOf('.');
  const intPart = dotIdx === -1 ? abs : abs.slice(0, dotIdx);
  const decPart = dotIdx === -1 ? '' : abs.slice(dotIdx);
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${intFormatted}${decPart}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const pct = value * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
