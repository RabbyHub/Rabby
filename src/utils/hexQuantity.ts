import BigNumber from 'bignumber.js';

const HEX_RE = /^0x[0-9a-f]+$/i;

const invalidQuantity = (value: unknown) =>
  new Error(`Invalid hex quantity: ${String(value)}`);

/**
 * Wei amount (gas price, max fee, priority fee) to an EIP-1474 hex quantity.
 *
 * Use this instead of @ethereumjs/util's intToHex for fee fields: intToHex
 * only takes safe integers, so a gas price above Number.MAX_SAFE_INTEGER
 * (~0.009 native token per gas unit, routine on chains whose native token is
 * worth little) throws and the signing page cannot build the tx.
 *
 * - number: converted exactly, so Number(toHexQuantity(n)) === Math.round(n)
 *   and the tx carries the very value the gas selector priced.
 * - hex or decimal string / bigint / BigNumber: kept at full precision.
 * - Fractional amounts round to the nearest wei, as Math.round did at the call
 *   sites.
 *
 * Fails closed: NaN, Infinity, negative or non-numeric input throws instead of
 * producing a fee field.
 */
export const toHexQuantity = (
  value: number | bigint | string | BigNumber
): string => {
  let wei: bigint;
  if (typeof value === 'bigint') {
    wei = value;
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw invalidQuantity(value);
    }
    wei = BigInt(Math.round(value));
  } else if (typeof value === 'string' && HEX_RE.test(value)) {
    wei = BigInt(value);
  } else {
    const bn = new BigNumber(value);
    if (!bn.isFinite() || bn.isLessThan(0)) {
      throw invalidQuantity(value);
    }
    wei = BigInt(bn.integerValue(BigNumber.ROUND_HALF_UP).toFixed());
  }
  if (wei < BigInt(0)) {
    throw invalidQuantity(value);
  }
  return `0x${wei.toString(16)}`;
};
