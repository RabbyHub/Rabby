export const splitNumberByStep = (
  num: number | string,
  step = 3,
  symbol = ','
) => {
  // eslint-disable-next-line prefer-const
  let [int, float] = (num + '').split('.');
  const reg = new RegExp(`(\\d)(?=(\\d{${step}})+(?!\\d))`, 'g');

  int = int.replace(reg, `$1${symbol}`);
  if (Number(num) > 1000000) {
    // hide the after-point part if number is more than 1000000
    float = '';
  }
  if (float) {
    return `${int}.${float}`;
  }
  return int;
};
