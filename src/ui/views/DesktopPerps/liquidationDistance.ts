import BigNumber from 'bignumber.js';
import { splitNumberByStep } from '@/ui/utils';
import {
  calculateDistanceToLiquidation,
  formatPerpsPct,
} from '@/ui/views/Perps/utils';

/**
 * How far the mark price is from liquidation, as `-1.86%(-1,230.5)`.
 *
 * The percentage and the absolute gap always carry the same sign, and it is
 * negative when liquidation sits below the mark — i.e. when the position is
 * losing ground toward it. Returns `''` when there is nothing to compare.
 *
 * Kept in its own leaf module rather than inside the `.tsx` cell that renders
 * it: jest's transform is `^.+\.[tj]s$`, so this is the only way the sign
 * convention stays under unit test.
 */
export const formatLiquidationDistance = (
  liqPrice: number | null | undefined,
  markPrice: number | null | undefined,
  pxDecimals: number
): string => {
  if (!liqPrice || !markPrice) return '';

  const sign = liqPrice < markPrice ? '-' : '';
  const gap = splitNumberByStep(
    new BigNumber(liqPrice).minus(markPrice).abs().toFixed(pxDecimals)
  );
  return `${sign}${formatPerpsPct(
    calculateDistanceToLiquidation(liqPrice, markPrice)
  )}(${sign}${gap})`;
};
