import { decodeSwapParams, PATH_KEY, POOL_KEY } from './params';

// Universal Router 2.0: no per-hop price fields.
const schemas: Record<number, string> = {
  0x06: `tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)`,
  0x07: `tuple(address currencyIn,${PATH_KEY}[] path,uint128 amountIn,uint128 amountOutMinimum)`,
  0x08: `tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 amountOut,uint128 amountInMaximum,bytes hookData)`,
  0x09: `tuple(address currencyOut,${PATH_KEY}[] path,uint128 amountOut,uint128 amountInMaximum)`,
};

export const decodeV4SwapV2_0 = (action: number, data: string, step: string) =>
  decodeSwapParams(action, data, schemas[action], step);
