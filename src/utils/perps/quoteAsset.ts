/**
 * Hyperliquid quote asset (shared)
 * for SW perpsLive and Perps UI
 */

import type { Meta } from '@rabby-wallet/hyperliquid-sdk';

export type PerpsQuoteAsset = 'USDC' | 'USDT' | 'USDH' | 'USDE';

export const ALL_PERPS_QUOTE_ASSETS: PerpsQuoteAsset[] = [
  'USDC',
  'USDT',
  'USDH',
  'USDE',
];

/**
 * collateralToken ID → quote token symbol。
 */
export const COLLATERAL_TOKEN_TO_QUOTE: Record<number, PerpsQuoteAsset> = {
  0: 'USDC',
  268: 'USDT',
  235: 'USDE',
  360: 'USDH',
};

export function getQuoteAssetFromMeta(meta: Meta): PerpsQuoteAsset {
  return COLLATERAL_TOKEN_TO_QUOTE[meta.collateralToken] ?? 'USDC';
}
