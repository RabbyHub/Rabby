import BigNumber from 'bignumber.js';

export const formatUsdValueKMB = (value: string | number): string => {
  const bnValue = new BigNumber(value);

  if (bnValue.lt(0)) {
    return '-';
  }

  if (bnValue.lt(0.01) && !bnValue.eq(0)) {
    return '-';
  }
  const numValue = bnValue.toNumber();
  let formattedValue: string;

  if (numValue >= 1e9) {
    formattedValue = `${(numValue / 1e9).toFixed(2)}B`;
  } else if (numValue >= 1e6) {
    formattedValue = `${(numValue / 1e6).toFixed(2)}M`;
  } else if (numValue >= 1e3) {
    formattedValue = `${(numValue / 1e3).toFixed(2)}K`;
  } else {
    formattedValue = numValue.toFixed(2);
  }

  return `$${formattedValue}`;
};
