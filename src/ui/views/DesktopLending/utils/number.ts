export const isZeroAmount = (amount: string) => {
  return amount === '0.' || amount === '.0' || amount === '.' || amount === '0';
};
