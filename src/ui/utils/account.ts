import BigNumber from 'bignumber.js';

export const sortAccountsByBalance = <
  T extends { address: string; balance: number }[]
>(
  accounts: T
) => {
  return accounts.sort((a, b) => {
    return new BigNumber(b?.balance || 0)
      .minus(new BigNumber(a?.balance || 0))
      .toNumber();
  });
};
