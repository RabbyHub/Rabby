export const splitNumberByStep = (
  num: number | string,
  step = 3,
  symbol = ','
) => {
  // eslint-disable-next-line prefer-const
  let [int, float] = (num + '').split('.');
  const reg = new RegExp(`(\\d)(?=(\\d{${step}})+(?!\\d))`, 'g');

  int = int.replace(reg, `$1${symbol}`);

  if (float) {
    return `${int}.${float}`;
  }
  return int;
};
