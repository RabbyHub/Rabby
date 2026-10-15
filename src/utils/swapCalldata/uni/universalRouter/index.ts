import { utils } from 'ethers';
import { CalldataDecodeError } from '../../errors';
import { Context, Swap } from '../shared';
import { walkCommands } from './commands';
import { getRouterProfile } from './profiles';

export const decodeUniversalRouter = (
  transaction: utils.TransactionDescription,
  chainId: number,
  ctx: Context
): Swap => {
  const profile = getRouterProfile(chainId, ctx.router);
  if (transaction.name === 'executeSigned' && !profile.supportsSigned) {
    throw new CalldataDecodeError(
      'decode.uni.routerVersion',
      `executeSigned is not supported by Router ${profile.version}`
    );
  }
  const swap: Swap = {};
  if (ctx.proxyToken) swap.fromToken = ctx.proxyToken;
  if (ctx.proxyAmount && ctx.proxyAmount !== '0')
    swap.fromTokenAmount = ctx.proxyAmount;
  // executeSigned sets route-signature context, but recipients still resolve
  // MSG_SENDER through the router's caller lock, not through the route signer.
  walkCommands(
    transaction.args.commands,
    transaction.args.inputs,
    swap,
    ctx,
    profile
  );
  return swap;
};
