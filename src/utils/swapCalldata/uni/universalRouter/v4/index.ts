import { CalldataDecodeError } from '../../../errors';
import {
  chainToken,
  Context,
  decodeAbi,
  setReceiver,
  setSwap,
  Swap,
  wrapNative,
} from '../../shared';
import { decodeV4SwapV2_0 } from './v2_0';
import { decodeV4SwapV2_1 } from './v2_1';

export const walkV4 = (
  input: string,
  swap: Swap,
  ctx: Context,
  version: '2.0' | '2.1',
  step: string
) => {
  const [actions, params] = decodeAbi(['bytes', 'bytes[]'], input, step);
  const actionBytes = actions.slice(2);
  if (actionBytes.length / 2 !== params.length) {
    throw new CalldataDecodeError(step, 'V4 actions and params lengths differ');
  }
  const decodeSwap = version === '2.0' ? decodeV4SwapV2_0 : decodeV4SwapV2_1;

  for (let i = 0; i < params.length; i++) {
    const action = parseInt(actionBytes.slice(i * 2, i * 2 + 2), 16);
    const data = params[i];
    const actionStep = `${step}.actions[${i}].0x${action
      .toString(16)
      .padStart(2, '0')}`;
    if (action >= 0x06 && action <= 0x09) {
      const parsed = decodeSwap(action, data, actionStep);
      setSwap(
        swap,
        ctx,
        parsed.fromToken,
        parsed.toToken,
        parsed.amountA,
        parsed.amountB,
        parsed.exactOut
      );
      continue;
    }

    switch (action) {
      case 0x0b: // SETTLE
      case 0x0c: // SETTLE_ALL
      case 0x0d: // SETTLE_PAIR
        break;
      case 0x0e: {
        // TAKE
        const [currency, recipient] = decodeAbi(
          ['address', 'address', 'uint256'],
          data,
          actionStep
        );
        swap.toToken = chainToken(currency, ctx.native);
        setReceiver(swap, recipient, ctx);
        break;
      }
      case 0x0f: {
        // TAKE_ALL
        const [currency, minimum] = decodeAbi(
          ['address', 'uint256'],
          data,
          actionStep
        );
        swap.toToken = chainToken(currency, ctx.native);
        swap.minReceive = minimum.toString();
        swap.receiver = ctx.sender;
        break;
      }
      case 0x10: // TAKE_PORTION: the following TAKE/SWEEP determines the final receiver.
        break;
      case 0x11: {
        // TAKE_PAIR
        const [, , recipient] = decodeAbi(
          ['address', 'address', 'address'],
          data,
          actionStep
        );
        setReceiver(swap, recipient, ctx);
        break;
      }
      case 0x12: // CLOSE_CURRENCY
        break;
      case 0x14: {
        // SWEEP has no amount/minimum field in V4.
        const [currency, recipient] = decodeAbi(
          ['address', 'address'],
          data,
          actionStep
        );
        swap.toToken = chainToken(currency, ctx.native);
        setReceiver(swap, recipient, ctx);
        break;
      }
      case 0x15: {
        // WRAP
        const [amount] = decodeAbi(['uint256'], data, actionStep);
        wrapNative(swap, ctx, amount.toString());
        break;
      }
      case 0x16: // UNWRAP only moves balances inside the router.
        decodeAbi(['uint256'], data, actionStep);
        break;
      default:
        throw new CalldataDecodeError(
          actionStep,
          `Unsupported V4 action 0x${action.toString(16)}`
        );
    }
  }
};
