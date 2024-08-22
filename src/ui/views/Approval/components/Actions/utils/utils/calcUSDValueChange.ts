import BigNumber from 'bignumber.js';

export const calcUSDValueChange = (pay: string, receive: string) => {
  const payBn = new BigNumber(pay);
  const receiveBn = new BigNumber(receive);
  if (payBn.eq(0) && receiveBn.eq(0)) return 0;
  if (payBn.eq(0)) return 1;
  if (receiveBn.eq(0)) return -1;
  return receiveBn.minus(payBn).div(payBn).toNumber();
};
