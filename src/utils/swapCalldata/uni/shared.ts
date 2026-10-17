import BigNumber from 'bignumber.js';
import { CalldataDecodeError } from '../errors';
import type { DecodeCalldataResult } from '../types';
import { isSameAddress, NULL_ADDRESS } from '../utils';

export const MSG_SENDER = '0x0000000000000000000000000000000000000001';
export const ROUTER = '0x0000000000000000000000000000000000000002';
const EETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const CONTRACT_BALANCE = new BigNumber(2).pow(255);

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
  pendingMinimums?: Record<string, string>;
  payouts?: Record<
    string,
    { token: string; minimum: string; receiver: string }
  >;
}

export interface Context {
  native: string;
  sender: string;
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

const isRouter = (recipient: string, ctx: Context) =>
  isSameAddress(recipient, ROUTER) || isSameAddress(recipient, ctx.router);

const recordPayout = (
  swap: Swap,
  ctx: Context,
  token: string,
  recipient: string,
  minimum: string
) => {
  const receiver = isSameAddress(recipient, MSG_SENDER)
    ? ctx.sender
    : recipient;
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

export const setReceiver = (swap: Swap, recipient: string, ctx: Context) => {
  if (isRouter(recipient, ctx)) return;
  swap.receiver = isSameAddress(recipient, MSG_SENDER) ? ctx.sender : recipient;
};

export const setSwap = (
  swap: Swap,
  ctx: Context,
  fromToken: string,
  toToken: string,
  amountA: string,
  amountB: string,
  step = 'decode.uni.inputAmount',
  payment: { recipient?: string; payerIsUser?: boolean } = {}
) => {
  const input = chainToken(fromToken, ctx.native);
  const output = chainToken(toToken, ctx.native);
  if (payment.payerIsUser === false) {
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
      const amount = realAmount(
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
    } else if (
      payment.payerIsUser !== false &&
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
  const pending = (swap.pendingMinimums ||= {});
  const inputKey = input.toLowerCase();
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
  exactAmount = false
) => {
  const output = chainToken(token, ctx.native);
  if (isRouter(recipient, ctx)) return;
  // A trailing sweep of the original input is a refund. It must not replace
  // an already identified payout in a different asset.
  if (
    swap.hasSwap &&
    isSameAddress(output, swap.fromToken || '') &&
    !isSameAddress(output, swap.toToken || '')
  )
    return;
  const pending = (swap.pendingMinimums ||= {});
  const key = output.toLowerCase();
  const amount = minimum ?? pending[key] ?? '0';
  pending[key] = exactAmount
    ? BigNumber.max(0, new BigNumber(pending[key] || 0).minus(amount)).toFixed()
    : '0';
  recordPayout(swap, ctx, output, recipient, amount);
};

export const wrapNative = (swap: Swap, ctx: Context, amount: string) => {
  if (swap.hasSwap || swap.inputAmountLocked) return;
  swap.fromToken = ctx.native;
  swap.fromTokenAmount = realAmount(amount, ctx.txValue);
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
