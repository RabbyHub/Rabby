import { CalldataDecodeError } from '../../../errors';
import { decodeAbi } from '../../shared';

export const POOL_KEY =
  'tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)';
export const PATH_KEY =
  'tuple(address intermediateCurrency,uint24 fee,int24 tickSpacing,address hooks,bytes hookData)';

export const decodeSwapParams = (
  action: number,
  data: string,
  schema: string,
  step: string
) => {
  // The official SDK encodes one dynamic struct. Its outer tuple offset is
  // part of the encoding; flattening its fields reads the wrong words.
  const params = decodeAbi([schema], data, step)[0];
  const single = action === 0x06 || action === 0x08;
  const exactOut = action === 0x08 || action === 0x09;
  let fromToken: string;
  let toToken: string;
  if (single) {
    fromToken = params.zeroForOne
      ? params.poolKey.currency0
      : params.poolKey.currency1;
    toToken = params.zeroForOne
      ? params.poolKey.currency1
      : params.poolKey.currency0;
  } else {
    const lastHop = params.path[params.path.length - 1];
    if (!lastHop) throw new CalldataDecodeError(step, 'V4 swap path is empty');
    fromToken = exactOut ? lastHop.intermediateCurrency : params.currencyIn;
    toToken = exactOut ? params.currencyOut : lastHop.intermediateCurrency;
  }
  return {
    fromToken,
    toToken,
    amountA: (exactOut ? params.amountOut : params.amountIn).toString(),
    amountB: (exactOut
      ? params.amountInMaximum
      : params.amountOutMinimum
    ).toString(),
    exactOut,
  };
};
