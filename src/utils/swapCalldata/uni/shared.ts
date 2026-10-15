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
  wrappedNativeIn?: boolean;
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
  exactOut: boolean
) => {
  if (exactOut || !swap.wrappedNativeIn)
    swap.fromToken = chainToken(fromToken, ctx.native);
  swap.toToken = chainToken(toToken, ctx.native);
  swap.fromTokenAmount = exactOut
    ? amountB
    : realAmount(
        amountA,
        swap.fromTokenAmount || ctx.proxyAmount || ctx.txValue
      );
  swap.minReceive = exactOut ? amountA : amountB;
};

export const wrapNative = (swap: Swap, ctx: Context, amount: string) => {
  swap.wrappedNativeIn = true;
  swap.fromToken = ctx.native;
  swap.fromTokenAmount = realAmount(amount, ctx.txValue);
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
  return {
    fromToken: swap.fromToken!,
    fromTokenAmount: swap.fromTokenAmount!,
    toToken: swap.toToken!,
    minReceiveToTokenAmount: swap.minReceive!,
    toTokenReceiver: swap.receiver!,
  };
};
