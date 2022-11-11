import BigNumber from 'bignumber.js';

export const splitNumberByStep = (
  num: number | string,
  step = 3,
  symbol = ',',
  forceInt = false
) => {
  const fmt: BigNumber.Format = {
    decimalSeparator: '.',
    groupSeparator: symbol,
    groupSize: step,
  };
  const n = new BigNumber(num);
  // hide the after-point part if number is more than 1000000
  if (n.isGreaterThan(1000000) || forceInt) {
    return n.decimalPlaces(0).toFormat(fmt);
  }
  return n.toFormat(fmt);
};

export const formatTokenAmount = (amount: number | string, decimals = 4) => {
  if (!amount) return '0';
  const bn = new BigNumber(amount);
  const str = bn.toFixed();
  const split = str.split('.');
  if (!split[1] || split[1].length < decimals) {
    return splitNumberByStep(bn.toFixed());
  }
  return splitNumberByStep(bn.toFixed(decimals));
};

export const numberWithCommasIsLtOne = (
  x?: number | string | BigNumber,
  precision?: number
) => {
  if (x === undefined || x === null) {
    return '-';
  }
  if (x.toString() === '0') return '0';

  if (x < 0.00005) {
    return '< 0.0001';
  }
  precision = x < 1 ? 4 : precision ?? 2;
  const parts: string[] = Number(x).toFixed(precision).split('.');

  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const formatNumber = (
  num: string | number,
  decimal = 2,
  opt = {} as BigNumber.Format
) => {
  const n = new BigNumber(num);
  const format = {
    prefix: '',
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: ' ',
    fractionGroupSize: 0,
    suffix: '',
    ...opt,
  };
  // hide the after-point part if number is more than 1000000
  if (n.isGreaterThan(1000000)) {
    return n.decimalPlaces(0).toFormat(format);
  }
  return n.toFormat(decimal, format);
};

export const intToHex = (n: number) => {
  if (n % 1 !== 0) throw new Error(`${n} is not int`);
  return `0x${n.toString(16)}`;
};
