import BigNumber from 'bignumber.js';

export const calcSlippageTolerance = (base: string, actual: string) => {
  const baseBn = new BigNumber(base);
  const actualBn = new BigNumber(actual);
  if (baseBn.eq(0) && actualBn.eq(0)) return 0;
  if (baseBn.eq(0)) return 1;
  if (actualBn.eq(0)) return -1;
  return baseBn.minus(actualBn).div(baseBn).toNumber();
};
