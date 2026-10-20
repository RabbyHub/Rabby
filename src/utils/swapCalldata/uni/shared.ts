import BigNumber from 'bignumber.js';
import { CalldataDecodeError } from '../errors';
import type { DecodeCalldataResult } from '../types';
import { isSameAddress, NULL_ADDRESS } from '../utils';
import { getArcNativeInputAmount, isSameUniAsset } from './assets';

export const MSG_SENDER = '0x0000000000000000000000000000000000000001';
export const ROUTER = '0x0000000000000000000000000000000000000002';
const EETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const CONTRACT_BALANCE = new BigNumber(2).pow(255);
export type Minimums = Record<string, string>;

export interface Swap {
  fromToken?: string;
  fromTokenAmount?: string;
  toToken?: string;
  minReceive?: string;
  receiver?: string;
  // The proxy transfer / native wrap describes the user's complete input.
  inputAmountLocked?: boolean;
  hasSwap?: boolean;
  // Intermediate router balances and completed payouts have different owners.
  pendingMinimums?: Minimums;
  payouts?: Record<
    string,
    { token: string; minimum: string; receiver: string }
  >;
}

export interface Context {
  chainId: number;
  native: string;
  sender: string;
  routerCaller: string;
  router: string;
  txValue: string;
  proxyToken?: string;
  proxyAmount?: string;
}

export const chainToken = (token: string, native: string) =>
  isSameAddress(token, NULL_ADDRESS) || isSameAddress(token, EETH)
    ? native
    : token;

export const realAmount = (amount: string, fallback?: string) =>
  CONTRACT_BALANCE.eq(amount) && fallback ? fallback : amount;

// Dispatcher.map() and BaseActionsRouter._mapRecipient() use the Router's
// execution caller, which is SwapProxy for proxied swaps, not the outer user.
// https://github.com/Uniswap/universal-router/blob/main/contracts/base/Dispatcher.sol
// https://github.com/Uniswap/v4-periphery/blob/main/src/base/BaseActionsRouter.sol
const resolveRecipient = (recipient: string, ctx: Context) =>
  isSameAddress(recipient, MSG_SENDER)
    ? ctx.routerCaller
    : isSameAddress(recipient, ROUTER)
    ? ctx.router
    : recipient;

const isRouter = (recipient: string, ctx: Context) =>
  isSameAddress(resolveRecipient(recipient, ctx), ctx.router);

const isInputRefund = (swap: Swap, ctx: Context, output: string) =>
  swap.hasSwap &&
  isSameUniAsset(output, swap.fromToken || '', ctx.chainId, ctx.native) &&
  !isSameUniAsset(output, swap.toToken || '', ctx.chainId, ctx.native);

const recordPayout = (
  swap: Swap,
  ctx: Context,
  token: string,
  recipient: string,
  minimum: string
) => {
  const receiver = resolveRecipient(recipient, ctx);
  const key = `${token.toLowerCase()}:${receiver.toLowerCase()}`;
  const payouts = (swap.payouts ||= {});
  payouts[key] = {
    token,
    receiver,
    minimum: new BigNumber(payouts[key]?.minimum || 0).plus(minimum).toFixed(),
  };
  swap.toToken = token;
  swap.minReceive = payouts[key].minimum;
  swap.receiver = receiver;
};

export const assertInputAsset = (
  swap: Swap,
  ctx: Context,
  token: string,
  step: string
) => {
  if (swap.inputAmountLocked)
    throw new CalldataDecodeError(
      step,
      'Additional user-funded debit after prepaid input cannot be represented by the locked input amount'
    );
  if (
    swap.fromToken &&
    !isSameUniAsset(
      chainToken(token, ctx.native),
      swap.fromToken,
      ctx.chainId,
      ctx.native
    )
  ) {
    throw new CalldataDecodeError(
      step,
      'Multiple user-funded input assets cannot be represented as a single swap result'
    );
  }
};

export const setSwap = (
  swap: Swap,
  ctx: Context,
  fromToken: string,
  toToken: string,
  amountA: string,
  amountB: string,
  step = 'decode.uni.inputAmount',
  payment: {
    recipient?: string;
    payerIsUser?: boolean;
    alreadyPaid?: boolean;
    minimums?: Minimums;
  } = {}
) => {
  const input = chainToken(fromToken, ctx.native);
  const output = chainToken(toToken, ctx.native);
  const pending = payment.minimums || (swap.pendingMinimums ||= {});
  const inputKey = input.toLowerCase();
  const poolCredit = payment.minimums && pending[inputKey] !== undefined;
  if (payment.payerIsUser === true) assertInputAsset(swap, ctx, input, step);
  if (payment.alreadyPaid && payment.payerIsUser === false) {
    // V4 can TAKE directly to the next V2 pair. A subsequent router-funded
    // swap consumes that handoff; it is not a completed payout to the caller.
    Object.entries(swap.payouts || {}).forEach(([key, payout]) => {
      if (
        isSameAddress(payout.token, input) &&
        !isSameAddress(payout.receiver, ctx.sender)
      )
        delete swap.payouts![key];
    });
  }
  if (!swap.inputAmountLocked) {
    if (!swap.hasSwap) {
      const nativeInputAmount =
        payment.payerIsUser === true
          ? undefined
          : isSameAddress(input, ctx.native) && new BigNumber(ctx.txValue).gt(0)
          ? ctx.txValue
          : getArcNativeInputAmount(input, ctx.chainId, ctx.txValue);
      const amount =
        nativeInputAmount ??
        realAmount(
          amountA,
          swap.fromTokenAmount || ctx.proxyAmount || ctx.txValue
        );
      if (!new BigNumber(amount).gt(0) || CONTRACT_BALANCE.eq(amount)) {
        throw new CalldataDecodeError(
          step,
          'Cannot determine the original input amount from a dynamic router balance'
        );
      }
      swap.fromToken = input;
      swap.fromTokenAmount = amount;
      if (nativeInputAmount !== undefined) swap.inputAmountLocked = true;
    } else if (
      payment.payerIsUser !== false &&
      !poolCredit &&
      isSameAddress(input, swap.fromToken || '')
    ) {
      const amount = amountA;
      // Only explicit root inputs can be summed. Intermediate OPEN_DELTA (0)
      // and CONTRACT_BALANCE values describe router funds, not another user debit.
      if (!CONTRACT_BALANCE.eq(amount)) {
        swap.fromTokenAmount = new BigNumber(swap.fromTokenAmount!)
          .plus(amount)
          .toFixed();
      }
    }
  }
  if (payment.payerIsUser !== true && pending[inputKey] !== undefined) {
    const amount = amountA;
    pending[inputKey] =
      amount === '0' || CONTRACT_BALANCE.eq(amount)
        ? '0'
        : BigNumber.max(
            0,
            new BigNumber(pending[inputKey]).minus(amount)
          ).toFixed();
  }
  swap.toToken = output;
  const minimum = amountB;
  swap.hasSwap = true;
  const recipient = payment.recipient || ROUTER;
  if (isRouter(recipient, ctx)) {
    const key = output.toLowerCase();
    pending[key] = new BigNumber(pending[key] || 0).plus(minimum).toFixed();
    swap.minReceive = pending[key];
  } else {
    recordPayout(swap, ctx, output, recipient, minimum);
  }
};

export const setOutput = (
  swap: Swap,
  ctx: Context,
  token: string,
  recipient: string,
  minimum?: string,
  exactAmount = false,
  poolMinimums?: Minimums
) => {
  const output = chainToken(token, ctx.native);
  if (isRouter(recipient, ctx) && !poolMinimums) return;
  const pending = poolMinimums || (swap.pendingMinimums ||= {});
  const key = output.toLowerCase();
  const amount = minimum ?? pending[key] ?? '0';
  pending[key] = exactAmount
    ? BigNumber.max(0, new BigNumber(pending[key] || 0).minus(amount)).toFixed()
    : '0';
  if (isRouter(recipient, ctx)) {
    // TAKE moves pool credit into the router; it is not another pool credit
    // or a payout to the user. Keep the two balances separate.
    const routerMinimums = (swap.pendingMinimums ||= {});
    routerMinimums[key] = new BigNumber(routerMinimums[key] || 0)
      .plus(amount)
      .toFixed();
    return;
  }
  // A trailing sweep of the original input is a refund. It must not replace
  // an already identified payout in a different asset.
  if (isInputRefund(swap, ctx, output)) return;
  recordPayout(swap, ctx, output, recipient, amount);
};

// Payments.sol and V4Router TAKE_PORTION transfer floor(balance * portion /
// denominator). Subtract that fee before a later balance-based payout.
// https://github.com/Uniswap/universal-router/blob/main/contracts/modules/Payments.sol
// https://github.com/Uniswap/v4-periphery/blob/main/src/V4Router.sol
export const payPortion = (
  swap: Swap,
  ctx: Context,
  token: string,
  recipient: string,
  portion: string,
  denominator: string,
  step: string,
  poolMinimums?: Minimums
) => {
  const ratio = new BigNumber(portion);
  if (!ratio.isInteger() || ratio.lt(0) || ratio.gt(denominator))
    throw new CalldataDecodeError(step, 'Invalid payment portion');
  if (isRouter(recipient, ctx) && !poolMinimums) return;
  const pending = poolMinimums || (swap.pendingMinimums ||= {});
  const output = chainToken(token, ctx.native);
  const key = output.toLowerCase();
  const minimum = new BigNumber(pending[key] || 0);
  // The remaining balance and the fee are monotone functions of the balance;
  // their lower bounds can both be computed from its known minimum.
  const fee = minimum.times(ratio).idiv(denominator).toFixed(0);
  pending[key] = minimum.minus(fee).toFixed(0);
  if (poolMinimums && isRouter(recipient, ctx)) {
    const routerMinimums = (swap.pendingMinimums ||= {});
    routerMinimums[key] = new BigNumber(routerMinimums[key] || 0)
      .plus(fee)
      .toFixed();
  } else if (isSameAddress(resolveRecipient(recipient, ctx), ctx.sender)) {
    if (!isInputRefund(swap, ctx, output))
      recordPayout(swap, ctx, output, recipient, fee);
  }
};

export const wrapNative = (
  swap: Swap,
  ctx: Context,
  amount: string,
  recipient: string,
  step: string
) => {
  if (!isRouter(recipient, ctx))
    throw new CalldataDecodeError(
      step,
      'WRAP_ETH to an external recipient is not modeled as a single swap input'
    );
  const pending = (swap.pendingMinimums ||= {});
  const key = ctx.native.toLowerCase();
  pending[key] = CONTRACT_BALANCE.eq(amount)
    ? '0'
    : BigNumber.max(
        0,
        new BigNumber(pending[key] || 0).minus(amount)
      ).toFixed();
  if (swap.hasSwap || swap.inputAmountLocked) return;
  swap.fromToken = ctx.native;
  // msg.value is the complete native budget, including subsequent split wraps
  // and any input eventually refunded, rather than just the first wrapped leg.
  swap.fromTokenAmount = new BigNumber(ctx.txValue).gt(0)
    ? ctx.txValue
    : realAmount(amount, ctx.txValue);
  swap.inputAmountLocked = true;
};

export const unwrapNative = (
  swap: Swap,
  ctx: Context,
  recipient: string,
  minimum: string
) => {
  setOutput(swap, ctx, ctx.native, recipient, minimum);
};

export const finishSwap = (swap: Swap): DecodeCalldataResult => {
  const payouts = Object.values(swap.payouts || {});
  if (payouts.length > 1) {
    throw new CalldataDecodeError(
      'decode.uni.result',
      'Multiple output assets or recipients cannot be represented as a single swap result'
    );
  }
  if (payouts.length === 1) {
    swap.toToken = payouts[0].token;
    swap.minReceive = payouts[0].minimum;
    swap.receiver = payouts[0].receiver;
  }
  const required = [
    'fromToken',
    'fromTokenAmount',
    'toToken',
    'minReceive',
    'receiver',
  ] as const;
  const missing = required.filter((field) => !swap[field]);
  if (missing.length) {
    throw new CalldataDecodeError(
      'decode.uni.result',
      `Incomplete swap data: missing ${missing.join(', ')}`
    );
  }
  if (
    !new BigNumber(swap.fromTokenAmount!).gt(0) ||
    CONTRACT_BALANCE.eq(swap.fromTokenAmount!)
  ) {
    throw new CalldataDecodeError(
      'decode.uni.result',
      'Original input amount is zero or unresolved'
    );
  }
  if (isSameAddress(swap.fromToken!, swap.toToken!)) {
    throw new CalldataDecodeError(
      'decode.uni.result',
      'The route does not describe a swap between two distinct assets'
    );
  }
  return {
    fromToken: swap.fromToken!,
    fromTokenAmount: swap.fromTokenAmount!,
    toToken: swap.toToken!,
    minReceiveToTokenAmount: swap.minReceive!,
    toTokenReceiver: swap.receiver!,
  };
};
