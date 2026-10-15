import { decodeSwapParams, PATH_KEY, POOL_KEY } from './params';

// Deprecated Universal Router 2.1.0: single swaps retain the 2.0 layout,
// while path swaps insert maxHopSlippage before the amounts.
// Verified IV4Router.sol: Ethereum 0xd92a36b0000531ef3063ded4de20a0783308446c.
const schemas: Record<number, string> = {
  0x06: `tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)`,
  0x07: `tuple(address currencyIn,${PATH_KEY}[] path,uint256[] maxHopSlippage,uint128 amountIn,uint128 amountOutMinimum)`,
  0x08: `tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountOut,uint128 amountInMaximum,bytes hookData)`,
  0x09: `tuple(address currencyOut,${PATH_KEY}[] path,uint256[] maxHopSlippage,uint128 amountOut,uint128 amountInMaximum)`,
};

export const decodeV4SwapV2_1_0 = (
  action: number,
  data: string,
  step: string
) => decodeSwapParams(action, data, schemas[action], step);
