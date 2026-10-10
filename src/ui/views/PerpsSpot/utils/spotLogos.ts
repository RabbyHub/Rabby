import type { MarketData } from '@/ui/state/perps';

/**
 * Logo for a spot token, borrowed from the perp market of the same coin.
 * Unit-bridged tokens (UBTC, UETH, USOL…) map to their underlying perp.
 */
export const resolveSpotTokenLogo = (
  marketDataMap: Record<string, Pick<MarketData, 'logoUrl'> | undefined>,
  baseName: string
): string => {
  const direct = marketDataMap[baseName]?.logoUrl;
  if (direct) {
    return direct;
  }
  if (baseName.length > 1 && baseName.startsWith('U')) {
    return marketDataMap[baseName.slice(1)]?.logoUrl || '';
  }
  return '';
};
