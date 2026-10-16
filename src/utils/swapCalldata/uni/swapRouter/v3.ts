import { utils } from 'ethers';
import { Context, setSwap, Swap, v3PathTokens } from '../shared';

// Both V3 SwapRouter and SwapRouter02 expose named swap tuples. Their ABI
// definitions remain separate because only the original includes deadline.
export const decodeV3Swap = (
  transaction: utils.TransactionDescription,
  swap: Swap,
  ctx: Context,
  step: string
) => {
  const params = transaction.args.params;
  const exactOut = transaction.name.startsWith('exactOutput');
  const single = transaction.name.endsWith('Single');
  const tokens = single
    ? [params.tokenIn, params.tokenOut]
    : v3PathTokens(params.path, step);
  const reverse = exactOut && !single;
  const amountA = exactOut ? params.amountOut : params.amountIn;
  const amountB = exactOut ? params.amountInMaximum : params.amountOutMinimum;
  const inputAmount =
    amountA.toString() === '0' && !exactOut
      ? swap.fromTokenAmount || ctx.proxyAmount || ctx.txValue
      : amountA.toString();
  setSwap(
    swap,
    ctx,
    reverse ? tokens[1] : tokens[0],
    reverse ? tokens[0] : tokens[1],
    inputAmount,
    amountB.toString(),
    exactOut,
    step,
    { recipient: params.recipient }
  );
};
