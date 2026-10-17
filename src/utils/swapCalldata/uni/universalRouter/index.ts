import { utils } from 'ethers';
import { Context, Swap } from '../shared';
import { walkCommands } from './commands';
import { getRouterProfile } from './profiles';

export const decodeUniversalRouter = (
  transaction: utils.TransactionDescription,
  chainId: number,
  ctx: Context
): Swap => {
  const profile = getRouterProfile(chainId, ctx.router);
  const swap: Swap = {};
  if (ctx.proxyToken && ctx.proxyAmount && ctx.proxyAmount !== '0') {
    swap.fromToken = ctx.proxyToken;
    swap.fromTokenAmount = ctx.proxyAmount;
    swap.inputAmountLocked = true;
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
