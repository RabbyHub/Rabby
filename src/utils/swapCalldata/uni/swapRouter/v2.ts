import { utils } from 'ethers';
import { CalldataDecodeError } from '../../errors';
import { Context, setReceiver, setSwap, Swap } from '../shared';

export const decodeV2Swap = (
  transaction: utils.TransactionDescription,
  swap: Swap,
  ctx: Context,
  step: string
) => {
  const { name, args } = transaction;
  const path = args.path as string[];
  if (path.length < 2)
    throw new CalldataDecodeError(
      step,
      'V2 swap path requires at least two tokens'
    );
  const nativeIn =
    name === 'swapExactETHForTokens' || name === 'swapETHForExactTokens';
  const nativeOut =
    name === 'swapExactTokensForETH' || name === 'swapTokensForExactETH';
  const exactOut =
    name === 'swapTokensForExactTokens' ||
    name === 'swapETHForExactTokens' ||
    name === 'swapTokensForExactETH';
  const inputAmount = nativeIn
    ? ctx.txValue
    : (exactOut ? args.amountInMax : args.amountIn).toString();
  const outputAmount = (exactOut
    ? args.amountOut
    : args.amountOutMin
  ).toString();
  setSwap(
    swap,
    ctx,
    nativeIn ? ctx.native : path[0],
    nativeOut ? ctx.native : path[path.length - 1],
    exactOut ? outputAmount : inputAmount,
    exactOut ? inputAmount : outputAmount,
    exactOut,
    step
  );
  setReceiver(swap, args.to, ctx);
};
