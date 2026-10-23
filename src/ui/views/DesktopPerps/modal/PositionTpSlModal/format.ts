import BigNumber from 'bignumber.js';
import { splitNumberByStep } from '@/ui/utils';
import { formatPerpsCoin } from '../../utils';
import type { TpSlAmountUnit } from '../../positionTpSl';

/** `+1,234.56` / `-1,234.56` */
export const formatSignedValue = (value: BigNumber) =>
  `${value.gte(0) ? '+' : '-'}${splitNumberByStep(value.abs().toFixed(2))}`;

/** Label for amounts that follow the global coin / USD switch. */
export const getAmountUnitLabel = (
  unit: TpSlAmountUnit,
  coin: string,
  quoteAsset: string
) => (unit === 'usd' ? quoteAsset : formatPerpsCoin(coin));

/** `50.00%` of the position, or `-` for an empty position. */
export const formatSizeRatio = (size: string, positionSize: string) => {
  const total = new BigNumber(positionSize);
  if (!total.isFinite() || total.lte(0)) return '-';
  return `${new BigNumber(size).div(total).times(100).toFixed(2)}%`;
};
