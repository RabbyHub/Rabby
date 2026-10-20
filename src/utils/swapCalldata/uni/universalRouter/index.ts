import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import { chainToken, Context, Swap } from '../shared';
import { walkCommands } from './commands';
import { getRouterProfile } from './profiles';

export const decodeUniversalRouter = (
  transaction: utils.TransactionDescription,
  chainId: number,
  ctx: Context
): Swap => {
  const profile = getRouterProfile(chainId, ctx.router);
  const swap: Swap = {};
  if (new BigNumber(ctx.txValue).gt(0))
    swap.pendingMinimums = { [ctx.native.toLowerCase()]: ctx.txValue };
  if (ctx.proxyToken && ctx.proxyAmount && ctx.proxyAmount !== '0') {
    swap.fromToken = ctx.proxyToken;
    swap.fromTokenAmount = ctx.proxyAmount;
    swap.inputAmountLocked = true;
    (swap.pendingMinimums ||= {})[
      chainToken(ctx.proxyToken, ctx.native).toLowerCase()
    ] = ctx.proxyAmount;
  }
  walkCommands(
    transaction.args.commands,
    transaction.args.inputs,
    swap,
    ctx,
    profile
  );
  return swap;
};
