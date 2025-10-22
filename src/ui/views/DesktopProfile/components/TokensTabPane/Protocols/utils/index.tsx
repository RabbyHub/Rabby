export function sum(arr: number[]) {
  return arr.reduce((prev, current) => {
    return prev + current;
  }, 0);
}

export function Amount(value: number) {
  return value;
}

export function SharedRate(dailyRate: number) {
  return dailyRate * 356 * 100 + '%';
}

export function ArraySort<T>(
  arr: Array<T>,
  cb: (v: T | any) => any,
  asc?: boolean
): T[] {
  try {
    // https://stackoverflow.com/a/53420326/6356579
    return [...arr].sort((v1, v2) => {
      const res = cb(v1) - cb(v2);
      return asc ? res : -res;
    });
  } catch (error) {
    return arr;
  }
}

export * from './table';
