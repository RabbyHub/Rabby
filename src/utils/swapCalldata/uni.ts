import { CHAINS } from '@debank/common';
import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import type { DecodeCalldataResult, TxWithChainId } from './types';
import { UniABI } from './abi';
import { isSameAddress, NULL_ADDRESS } from './utils';

const { defaultAbiCoder, Interface } = utils;

// Extracted from @rabby-wallet/rabby-swap@0.0.88-alpha.0 for local iteration.
const uniInterface = new Interface(UniABI);

const MSG_SENDER = '0x0000000000000000000000000000000000000001';
const ROUTER = '0x0000000000000000000000000000000000000002';
const EETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const CONTRACT_BALANCE = new BigNumber(2).pow(255);
const COMMAND_MASK = 0x7f;

const Command = {
  V3_EXACT_IN: 0x00,
  V3_EXACT_OUT: 0x01,
  SWEEP: 0x04,
  TRANSFER: 0x05,
  V2_EXACT_IN: 0x08,
  V2_EXACT_OUT: 0x09,
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
  UNWRAP_WETH_EXACT: 0x0f,
  V4_SWAP: 0x10,
  SUB_PLAN: 0x21,
} as const;

const V4 = {
  EXACT_IN_SINGLE: 0x06,
  EXACT_IN: 0x07,
  EXACT_OUT_SINGLE: 0x08,
  EXACT_OUT: 0x09,
  TAKE: 0x0e,
  TAKE_ALL: 0x0f,
  TAKE_PAIR: 0x11,
  SWEEP: 0x14,
  WRAP: 0x15,
  UNWRAP: 0x16,
} as const;

const POOL_KEY = 'tuple(address,address,uint24,int24,address)';
const PATH_HOP = 'tuple(address,uint24,int24,address,bytes)';

type Swap = {
  fromToken?: string;
  fromTokenAmount?: string;
  toToken?: string;
  minReceive?: string;
  receiver?: string;
  wrappedNativeIn?: boolean;
};

type Ctx = {
  native: string;
  txFrom: string;
  proxyToken?: string;
  proxyAmount?: string;
  txValue?: string;
};

const decode = (types: string[], data: string) => {
  try {
    return defaultAbiCoder.decode(types, data);
  } catch {
    return null;
  }
};

const decodeAny = (variants: string[][], data: string) => {
  for (const types of variants) {
    const result = decode(types, data);
    if (result) return result;
  }
  return null;
};

const chainToken = (token: string, native: string) =>
  isSameAddress(token, NULL_ADDRESS) || isSameAddress(token, EETH)
    ? native
    : token;

const realAmount = (amount: string, fallback?: string) =>
  CONTRACT_BALANCE.eq(amount) && fallback ? fallback : amount;

const setSwap = (
  swap: Swap,
  ctx: Ctx,
  fromToken: string,
  toToken: string,
  amountA: string,
  amountB: string,
  exactOut: boolean
) => {
  if (exactOut || !swap.wrappedNativeIn) {
    swap.fromToken = chainToken(fromToken, ctx.native);
  }
  swap.toToken = chainToken(toToken, ctx.native);
  swap.fromTokenAmount = exactOut
    ? amountB
    : realAmount(
        amountA,
        swap.fromTokenAmount || ctx.proxyAmount || ctx.txValue
      );
  swap.minReceive = exactOut ? amountA : amountB;
};

const setReceiver = (swap: Swap, recipient: string, txFrom: string) => {
  if (isSameAddress(recipient, ROUTER)) return;
  const receiver = isSameAddress(recipient, MSG_SENDER) ? txFrom : recipient;
  if (receiver) swap.receiver = receiver;
};

const applyAmmSwap = (
  swap: Swap,
  ctx: Ctx,
  input: string,
  exactOut: boolean,
  v3: boolean
) => {
  const result = decode(
    ['address', 'uint256', 'uint256', v3 ? 'bytes' : 'address[]', 'bool'],
    input
  );
  if (!result) return;
  const [recipient, amountA, amountB, path] = result;

  let tokens: string[];
  if (v3) {
    // V3 path 是紧凑编码的 token + fee + token，不能按 address[] 解码。
    const hex = (path as string).replace(/^0x/i, '');
    if (hex.length < 86) return;
    tokens = [`0x${hex.slice(0, 40)}`, `0x${hex.slice(-40)}`];
  } else {
    tokens = path;
    if (!tokens?.length) return;
  }
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  setSwap(
    swap,
    ctx,
    exactOut ? last : first,
    exactOut ? first : last,
    amountA.toString(),
    amountB.toString(),
    exactOut
  );
  setReceiver(swap, recipient, ctx.txFrom);
};

const wrapNative = (swap: Swap, ctx: Ctx, amount: string) => {
  swap.wrappedNativeIn = true;
  swap.fromToken = ctx.native;
  swap.fromTokenAmount = realAmount(amount, ctx.txValue);
};

const unwrapNative = (
  swap: Swap,
  ctx: Ctx,
  recipient: string,
  minOut: string
) => {
  swap.toToken = ctx.native;
  swap.minReceive = minOut;
  setReceiver(swap, recipient, ctx.txFrom);
};

const readV4Single = (params: string) => {
  const decoded = decodeAny(
    [
      [POOL_KEY, 'bool', 'uint128', 'uint128', 'uint256', 'bytes'],
      [POOL_KEY, 'bool', 'uint128', 'uint128', 'bytes'],
    ],
    params
  );
  if (!decoded) return null;
  const pool = decoded[0] as string[];
  const zeroForOne = Boolean(decoded[1]);
  return {
    fromToken: zeroForOne ? pool[0] : pool[1],
    toToken: zeroForOne ? pool[1] : pool[0],
    amountA: decoded[2].toString() as string,
    amountB: decoded[3].toString() as string,
  };
};

const readV4Path = (params: string, exactOut: boolean) => {
  const decoded = decodeAny(
    [
      ['address', `${PATH_HOP}[]`, 'uint256[]', 'uint128', 'uint128'],
      ['address', `${PATH_HOP}[]`, 'uint128', 'uint128'],
    ],
    params
  );
  if (!decoded) return null;
  const path = decoded[1] as {
    intermediateCurrency?: string;
    [i: number]: string;
  }[];
  const lastHop = path[path.length - 1];
  const end = lastHop?.intermediateCurrency || lastHop?.[0];
  if (!end) return null;
  const hasHopPrices = decoded.length === 5;
  const amountA = (hasHopPrices ? decoded[3] : decoded[2]).toString() as string;
  const amountB = (hasHopPrices ? decoded[4] : decoded[3]).toString() as string;
  return exactOut
    ? { fromToken: end, toToken: decoded[0] as string, amountA, amountB }
    : { fromToken: decoded[0] as string, toToken: end, amountA, amountB };
};

const walkV4 = (swap: Swap, ctx: Ctx, input: string) => {
  const decoded = decode(['bytes', 'bytes[]'], input);
  if (!decoded) return;
  const actions = (decoded[0] as string).replace(/^0x/i, '');
  const params = decoded[1] as string[];

  for (let i = 0; i < actions.length / 2; i++) {
    const action = parseInt(actions.slice(i * 2, i * 2 + 2), 16);
    const data = params[i];
    if (!data) continue;

    if (
      action === V4.EXACT_IN_SINGLE ||
      action === V4.EXACT_IN ||
      action === V4.EXACT_OUT_SINGLE ||
      action === V4.EXACT_OUT
    ) {
      const exactOut =
        action === V4.EXACT_OUT_SINGLE || action === V4.EXACT_OUT;
      const single =
        action === V4.EXACT_IN_SINGLE || action === V4.EXACT_OUT_SINGLE;
      const parsed = single ? readV4Single(data) : readV4Path(data, exactOut);
      if (parsed) {
        setSwap(
          swap,
          ctx,
          parsed.fromToken,
          parsed.toToken,
          parsed.amountA,
          parsed.amountB,
          exactOut
        );
      }
    } else if (action === V4.TAKE) {
      const take = decode(['address', 'address', 'uint256'], data);
      if (!take) continue;
      swap.toToken = chainToken(take[0], ctx.native);
      setReceiver(swap, take[1], ctx.txFrom);
    } else if (action === V4.TAKE_ALL) {
      const take = decode(['address', 'uint256'], data);
      if (!take) continue;
      swap.toToken = chainToken(take[0], ctx.native);
      swap.minReceive = take[1].toString();
      swap.receiver = ctx.txFrom;
    } else if (action === V4.TAKE_PAIR) {
      const take = decode(['address', 'address', 'address'], data);
      if (take) setReceiver(swap, take[2], ctx.txFrom);
    } else if (action === V4.SWEEP) {
      const sweep = decode(['address', 'address', 'uint256'], data);
      if (!sweep) continue;
      swap.toToken = chainToken(sweep[0], ctx.native);
      swap.minReceive = sweep[2].toString();
      setReceiver(swap, sweep[1], ctx.txFrom);
    } else if (action === V4.WRAP) {
      const wrap = decode(['address', 'uint256'], data);
      if (wrap) wrapNative(swap, ctx, wrap[1].toString());
    } else if (action === V4.UNWRAP) {
      const unwrap = decode(['address', 'uint256'], data);
      if (unwrap) unwrapNative(swap, ctx, unwrap[0], unwrap[1].toString());
    }
  }
};

const walkCommands = (commands: string, inputs: string[], ctx: Ctx): Swap => {
  const swap: Swap = {};
  if (ctx.proxyToken && !isSameAddress(ctx.proxyToken, NULL_ADDRESS)) {
    swap.fromToken = ctx.proxyToken;
  }
  if (ctx.proxyAmount && ctx.proxyAmount !== '0') {
    swap.fromTokenAmount = ctx.proxyAmount;
  }

  const cmdHex = (commands || '').replace(/^0x/i, '');
  for (let i = 0; i < cmdHex.length / 2; i++) {
    const command = parseInt(cmdHex.slice(i * 2, i * 2 + 2), 16) & COMMAND_MASK;
    const input = inputs[i];
    if (!input) continue;

    switch (command) {
      case Command.V3_EXACT_IN:
        applyAmmSwap(swap, ctx, input, false, true);
        break;
      case Command.V3_EXACT_OUT:
        applyAmmSwap(swap, ctx, input, true, true);
        break;
      case Command.V2_EXACT_IN:
        applyAmmSwap(swap, ctx, input, false, false);
        break;
      case Command.V2_EXACT_OUT:
        applyAmmSwap(swap, ctx, input, true, false);
        break;
      case Command.WRAP_ETH: {
        const wrap = decode(['address', 'uint256'], input);
        if (wrap) wrapNative(swap, ctx, wrap[1].toString());
        break;
      }
      case Command.UNWRAP_WETH:
      case Command.UNWRAP_WETH_EXACT: {
        const unwrap = decode(['address', 'uint256'], input);
        if (unwrap) unwrapNative(swap, ctx, unwrap[0], unwrap[1].toString());
        break;
      }
      case Command.SWEEP:
      case Command.TRANSFER: {
        const pay = decode(['address', 'address', 'uint256'], input);
        if (!pay) break;
        swap.toToken = chainToken(pay[0], ctx.native);
        if (command === Command.SWEEP) swap.minReceive = pay[2].toString();
        setReceiver(swap, pay[1], ctx.txFrom);
        break;
      }
      case Command.V4_SWAP:
        walkV4(swap, ctx, input);
        break;
      case Command.SUB_PLAN: {
        const nested = decode(['bytes', 'bytes[]'], input);
        if (!nested) break;
        Object.assign(swap, walkCommands(nested[0], nested[1], ctx));
        break;
      }
      default:
        break;
    }
  }

  return swap;
};

export const decodeCalldata = (
  tx: TxWithChainId
): DecodeCalldataResult | null => {
  const chain = Object.values(CHAINS).find((item) => item.id === tx.chainId);
  if (!chain) return null;

  const result = uniInterface.parseTransaction({ data: tx.data });
  if (result.name !== 'execute') return null;

  const { commands, inputs, token, amount } = result.args;
  const swap = walkCommands(commands, inputs, {
    native: chain.nativeTokenAddress,
    txFrom: tx.from,
    proxyToken: token,
    proxyAmount: amount?.toString(),
    txValue: tx.value?.toString(),
  });

  if (
    !swap.fromToken ||
    !swap.fromTokenAmount ||
    !swap.toToken ||
    !swap.minReceive ||
    !swap.receiver
  ) {
    return null;
  }

  return {
    fromToken: swap.fromToken,
    fromTokenAmount: swap.fromTokenAmount,
    toToken: swap.toToken,
    minReceiveToTokenAmount: swap.minReceive,
    toTokenReceiver: swap.receiver,
  };
};
