import BigNumber from 'bignumber.js';

export const splitNumberByStep = (
  num: number | string,
  step = 3,
  symbol = ',',
  forceInt = false
) => {
  // eslint-disable-next-line prefer-const
  let [int, float] = (num + '').split('.');
  const reg = new RegExp(`(\\d)(?=(\\d{${step}})+(?!\\d))`, 'g');

  int = int.replace(reg, `$1${symbol}`);
  if (Number(num) > 1000000 || forceInt) {
    // hide the after-point part if number is more than 1000000
    float = '';
  }
  if (float) {
    return `${int}.${float}`;
  }
  return int;
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
