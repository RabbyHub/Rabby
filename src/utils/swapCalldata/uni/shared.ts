import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import { CalldataDecodeError, decodeAt } from '../errors';
import type { DecodeCalldataResult } from '../types';
import { isSameAddress, NULL_ADDRESS } from '../utils';

export const MSG_SENDER = '0x0000000000000000000000000000000000000001';
export const ROUTER = '0x0000000000000000000000000000000000000002';
const EETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const CONTRACT_BALANCE = new BigNumber(2).pow(255);

export interface Swap {
  fromToken?: string;
  fromTokenAmount?: string;
  toToken?: string;
  minReceive?: string;
  receiver?: string;
  // The proxy transfer / native wrap describes the user's complete input.
  inputAmountLocked?: boolean;
  hasSwap?: boolean;
}

export interface Context {
  native: string;
  sender: string;
  router: string;
  txValue: string;
  proxyToken?: string;
  proxyAmount?: string;
}

export const decodeAbi = (types: string[], data: string, step: string) =>
  decodeAt(step, () => utils.defaultAbiCoder.decode(types, data));

export const chainToken = (token: string, native: string) =>
  isSameAddress(token, NULL_ADDRESS) || isSameAddress(token, EETH)
    ? native
    : token;

export const realAmount = (amount: string, fallback?: string) =>
  CONTRACT_BALANCE.eq(amount) && fallback ? fallback : amount;

export const setReceiver = (swap: Swap, recipient: string, ctx: Context) => {
  if (isSameAddress(recipient, ROUTER) || isSameAddress(recipient, ctx.router))
    return;
  swap.receiver = isSameAddress(recipient, MSG_SENDER) ? ctx.sender : recipient;
};

export const setSwap = (
  swap: Swap,
  ctx: Context,
  fromToken: string,
  toToken: string,
  amountA: string,
  amountB: string,
  exactOut: boolean,
  step = 'decode.uni.inputAmount'
) => {
  const input = chainToken(fromToken, ctx.native);
  const output = chainToken(toToken, ctx.native);
  const sameOutput = isSameAddress(output, swap.toToken || '');
  if (!swap.inputAmountLocked) {
    if (!swap.hasSwap) {
      const amount = exactOut
        ? amountB
        : realAmount(
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
    } else if (isSameAddress(input, swap.fromToken || '')) {
      const amount = exactOut ? amountB : amountA;
      // Only explicit root inputs can be summed. Intermediate OPEN_DELTA (0)
      // and CONTRACT_BALANCE values describe router funds, not another user debit.
      if (!CONTRACT_BALANCE.eq(amount)) {
        swap.fromTokenAmount = new BigNumber(swap.fromTokenAmount!)
          .plus(amount)
          .toFixed();
      }
    }
  }
  swap.toToken = output;
  const minimum = exactOut ? amountA : amountB;
  swap.minReceive = sameOutput
    ? new BigNumber(swap.minReceive || 0).plus(minimum).toFixed()
    : minimum;
  swap.hasSwap = true;
};

export const setOutput = (
  swap: Swap,
  ctx: Context,
  token: string,
  recipient: string,
  minimum?: string
) => {
  const output = chainToken(token, ctx.native);
  if (isSameAddress(recipient, ROUTER) || isSameAddress(recipient, ctx.router))
    return;
  // A trailing sweep of the original input is a refund. It must not replace
  // an already identified payout in a different asset.
  if (
    swap.hasSwap &&
    isSameAddress(output, swap.fromToken || '') &&
    !isSameAddress(output, swap.toToken || '')
  )
    return;
  swap.toToken = output;
  if (minimum !== undefined) swap.minReceive = minimum;
  setReceiver(swap, recipient, ctx);
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
  swap.toToken = ctx.native;
  swap.minReceive = minimum;
  setReceiver(swap, recipient, ctx);
};

export const v3PathTokens = (path: string, step: string) => {
  const hex = path.slice(2);
  if (hex.length < 86 || (hex.length - 40) % 46 !== 0) {
    throw new CalldataDecodeError(step, 'Invalid Uniswap V3 token/fee path');
  }
  return [`0x${hex.slice(0, 40)}`, `0x${hex.slice(-40)}`];
};

export const finishSwap = (swap: Swap): DecodeCalldataResult => {
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
