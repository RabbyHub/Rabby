import type { UniversalRouterVersion } from '@uniswap/universal-router-sdk';
import { CalldataDecodeError } from '../../../errors';
import { Context, setReceiver, setSwap, Swap, setOutput } from '../../shared';
import { decodeV4Action, readPlan } from '../sdk';

export const walkV4 = (
  input: string,
  swap: Swap,
  ctx: Context,
  version: UniversalRouterVersion,
  step: string
) => {
  const { commands: actions, inputs: params } = readPlan(input, step);
  const actionBytes = actions.slice(2);
  if (actionBytes.length / 2 !== params.length) {
    throw new CalldataDecodeError(step, 'V4 actions and params lengths differ');
  }

  for (let i = 0; i < params.length; i++) {
    const action = parseInt(actionBytes.slice(i * 2, i * 2 + 2), 16);
    const actionStep = `${step}.actions[${i}].0x${action
      .toString(16)
      .padStart(2, '0')}`;
    const decoded = decodeV4Action(action, params[i], version, actionStep);
    const args = decoded.params;
    switch (decoded.name) {
      case 'SWAP_EXACT_IN_SINGLE':
      case 'SWAP_EXACT_IN': {
        const single = decoded.name === 'SWAP_EXACT_IN_SINGLE';
        const data = args.swap;
        const lastHop = !single && data.path[data.path.length - 1];
        if (!single && !lastHop)
          throw new CalldataDecodeError(actionStep, 'V4 swap path is empty');
        const from = single
          ? data.poolKey[data.zeroForOne ? 'currency0' : 'currency1']
          : data.currencyIn;
        const to = single
          ? data.poolKey[data.zeroForOne ? 'currency1' : 'currency0']
          : lastHop.intermediateCurrency;
        setSwap(
          swap,
          ctx,
          from,
          to,
          data.amountIn.toString(),
          data.amountOutMinimum.toString(),
          actionStep
        );
        break;
      }
      case 'TAKE': {
        const amount = args.amount.toString();
        setOutput(
          swap,
          ctx,
          args.currency,
          args.recipient,
          amount === '0' ? undefined : amount,
          amount !== '0'
        );
        break;
      }
      case 'TAKE_ALL':
        setOutput(
          swap,
          ctx,
          args.currency,
          ctx.sender,
          args.minAmount.toString()
        );
        break;
      case 'TAKE_PAIR':
        setReceiver(swap, args.recipient, ctx);
        break;
      case 'SWEEP':
        setOutput(swap, ctx, args.currency, args.recipient);
        break;
      case 'SETTLE':
      case 'SETTLE_ALL':
      case 'SETTLE_PAIR':
      case 'TAKE_PORTION':
      case 'CLOSE_CURRENCY':
      case 'UNWRAP':
        break;
      default:
        throw new CalldataDecodeError(
          actionStep,
          `Unsupported V4 action ${decoded.name} for the current exact-input quote flow`
        );
    }
  }
};
