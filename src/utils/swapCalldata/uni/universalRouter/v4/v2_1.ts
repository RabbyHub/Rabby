import { decodeSwapParams, PATH_KEY, POOL_KEY } from './params';

// Universal Router 2.1.1 / 2.1.2 / 2.2.0 add minHopPriceX36.
// Source: Uniswap/sdks, sdks/v4-sdk/src/utils/v4Planner.ts.
const schemas: Record<number, string> = {
  0x06: `tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,uint256 minHopPriceX36,bytes hookData)`,
  0x07: `tuple(address currencyIn,${PATH_KEY}[] path,uint256[] minHopPriceX36,uint128 amountIn,uint128 amountOutMinimum)`,
  0x08: `tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountOut,uint128 amountInMaximum,uint256 minHopPriceX36,bytes hookData)`,
  0x09: `tuple(address currencyOut,${PATH_KEY}[] path,uint256[] minHopPriceX36,uint128 amountOut,uint128 amountInMaximum)`,
};

export const decodeV4SwapV2_1 = (action: number, data: string, step: string) =>
  decodeSwapParams(action, data, schemas[action], step);
