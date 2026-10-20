import BigNumber from 'bignumber.js';
import type { UniversalRouterVersion } from '@uniswap/universal-router-sdk';
import { CalldataDecodeError } from '../../../errors';
import {
  assertInputAsset,
  chainToken,
  Context,
  CONTRACT_BALANCE,
  MSG_SENDER,
  Minimums,
  payPortion,
  setSwap,
  Swap,
  setOutput,
} from '../../shared';
import { decodeV4Action, readPlan } from '../sdk';
import { isSameUniAsset } from '../../assets';

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

  // PoolManager credit is not a router balance. TAKE transfers it to the
  // router or the recipient; SETTLE can spend router funds in the other direction.
  // https://github.com/Uniswap/v4-periphery/blob/main/src/base/DeltaResolver.sol
  const poolMinimums: Minimums = {};
  const debtBounds: Minimums = {};
  for (let i = 0; i < params.length; i++) {
    const action = parseInt(actionBytes.slice(i * 2, i * 2 + 2), 16);
    const actionStep = `${step}.actions[${i}].0x${action
      .toString(16)
      .padStart(2, '0')}`;
    const decoded = decodeV4Action(action, params[i], version, actionStep);
    const args = decoded.params;
    const keyFor = (currency: string) =>
      chainToken(currency, ctx.native).toLowerCase();
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
        const amount = data.amountIn.toString();
        const key = keyFor(from);
        if (
          swap.fromToken &&
          isSameUniAsset(to, swap.fromToken, ctx.chainId, ctx.native) &&
          !swap.inputAmountLocked
        ) {
          throw new CalldataDecodeError(
            actionStep,
            'V4 returns the original input asset without a fixed prepaid budget; the net user input depends on pool deltas'
          );
        }
        if (amount === '0' && poolMinimums[key] === undefined) {
          throw new CalldataDecodeError(
            actionStep,
            'OPEN_DELTA input has no preceding pool credit'
          );
        }
        // A prior pool credit can fund an intermediate leg. Only its possible
        // shortfall contributes to the upper bound later spent by SETTLE.
        if (amount !== '0') {
          const debt = BigNumber.max(
            0,
            new BigNumber(amount).minus(poolMinimums[key] || 0)
          );
          debtBounds[key] = new BigNumber(debtBounds[key] || 0)
            .plus(debt)
            .toFixed();
        }
        // Output first repays any existing debt in that currency; only the
        // excess is a positive pool credit available to TAKE or OPEN_DELTA.
        const outputKey = keyFor(to);
        const outputMinimum = new BigNumber(data.amountOutMinimum.toString());
        const outputDebt = new BigNumber(debtBounds[outputKey] || 0);
        debtBounds[outputKey] = BigNumber.max(
          0,
          outputDebt.minus(outputMinimum)
        ).toFixed();
        setSwap(
          swap,
          ctx,
          from,
          to,
          amount,
          BigNumber.max(0, outputMinimum.minus(outputDebt)).toFixed(),
          actionStep,
          { minimums: poolMinimums }
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
          amount !== '0',
          poolMinimums
        );
        break;
      }
      case 'TAKE_ALL':
        setOutput(
          swap,
          ctx,
          args.currency,
          // V4Router TAKE_ALL pays msgSender(), including the proxy caller.
          // https://github.com/Uniswap/v4-periphery/blob/main/src/V4Router.sol
          MSG_SENDER,
          BigNumber.max(
            poolMinimums[keyFor(args.currency)] || 0,
            args.minAmount.toString()
          ).toFixed(),
          false,
          poolMinimums
        );
        break;
      case 'TAKE_PORTION':
        payPortion(
          swap,
          ctx,
          args.currency,
          args.recipient,
          args.bips.toString(),
          '10000',
          actionStep,
          poolMinimums
        );
        break;
      case 'SETTLE':
      case 'SETTLE_ALL': {
        const key = keyFor(args.currency);
        const amount = decoded.name === 'SETTLE' ? args.amount.toString() : '0';
        const payerIsUser = decoded.name === 'SETTLE_ALL' || args.payerIsUser;
        const native = key === ctx.native.toLowerCase();
        const pending = (swap.pendingMinimums ||= {});
        const debt = new BigNumber(debtBounds[key] || 0);
        // Native currency always comes from the router's msg.value/balance,
        // even if the settlement specifies the user as payer.
        if (
          payerIsUser &&
          !native &&
          (new BigNumber(debtBounds[key] || 0).gt(0) ||
            new BigNumber(amount).gt(0))
        ) {
          assertInputAsset(swap, ctx, args.currency, actionStep);
        }
        if (amount !== '0') {
          // SETTLE may precede SWAP: overpayment creates pool credit that a
          // subsequent OPEN_DELTA swap consumes. CONTRACT_BALANCE reads the
          // router, not the user's allowance or a previous pool credit.
          const settledMinimum = CONTRACT_BALANCE.eq(amount)
            ? new BigNumber(pending[key] || 0)
            : new BigNumber(amount);
          const credit = BigNumber.max(0, settledMinimum.minus(debt));
          // Merely clearing a debt does not create a reusable input credit.
          // Retain a zero lower bound only for an actual prepayment or a
          // previously established credit whose exact balance is unknown.
          if (
            debt.isZero() ||
            credit.gt(0) ||
            poolMinimums[key] !== undefined
          ) {
            poolMinimums[key] = new BigNumber(poolMinimums[key] || 0)
              .plus(credit)
              .toFixed();
          }
          if (
            !swap.hasSwap &&
            !swap.fromToken &&
            payerIsUser &&
            !native &&
            !CONTRACT_BALANCE.eq(amount)
          ) {
            swap.fromToken = chainToken(args.currency, ctx.native);
            swap.fromTokenAmount = amount;
            swap.inputAmountLocked = true;
          }
        }
        if (!payerIsUser || native) {
          const bound = amount === '0' ? debtBounds[key] : amount;
          pending[key] =
            bound === undefined || CONTRACT_BALANCE.eq(bound)
              ? '0'
              : BigNumber.max(
                  0,
                  new BigNumber(pending[key] || 0).minus(bound)
                ).toFixed();
        }
        debtBounds[key] =
          amount === '0' || CONTRACT_BALANCE.eq(amount)
            ? '0'
            : BigNumber.max(0, debt.minus(amount)).toFixed();
        break;
      }
      default:
        // An SDK ABI entry does not imply that its payment effects are modeled.
        // Never ignore an action that could change the final assets or amounts.
        throw new CalldataDecodeError(
          actionStep,
          `Unsupported V4 action ${decoded.name} for the current exact-input quote flow`
        );
    }
  }
};
