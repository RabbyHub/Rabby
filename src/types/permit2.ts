// https://github.com/Uniswap/permit2/blob/cc56ad0f3439c502c246fc5cfcc3db92bb8b7219/src/interfaces/IAllowanceTransfer.sol#L89
export type TokenSpenderPair = {
  // the token the spender is approved
  token: string;
  // the spender address
  spender: string;
};
