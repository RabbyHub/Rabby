import { utils } from 'ethers';
import { getNativeTokenAddress } from '../chain';
import { decodeAt } from '../errors';
import type {
  DecodeCalldataOptions,
  DecodeCalldataResult,
  TxWithChainId,
} from '../types';
import { UniABI } from './abi';
import { Context, finishSwap } from './shared';
import { decodeUniversalRouter } from './universalRouter';
import { getRouterProfile } from './universalRouter/profiles';
import { normalizeUniAssets } from './assets';

const uniInterface = new utils.Interface(UniABI);

export const getVersion = (tx: TxWithChainId) => {
  const fragment = uniInterface.getFunction(tx.data.slice(0, 10));
  const proxy = fragment.inputs[0]?.name === 'router';
  const router = proxy
    ? uniInterface.parseTransaction({ data: tx.data }).args.router
    : tx.to;
  const { version } = getRouterProfile(tx.chainId, router);
  return `Universal Router ${version}${proxy ? ' (SwapProxy)' : ''}`;
};

export const decodeCalldata = (
  tx: TxWithChainId,
  options: DecodeCalldataOptions = {}
): DecodeCalldataResult => {
  const native = getNativeTokenAddress(tx.chainId, options.nativeTokenAddress);
  const transaction = decodeAt('decode.transactionABI', () =>
    uniInterface.parseTransaction({ data: tx.data })
  );
  const ctx: Context = {
    native,
    sender: tx.from,
    // SwapProxy passes the actual Universal Router as an explicit argument.
    router: transaction.args.router || tx.to,
    proxyToken: transaction.args.token,
    proxyAmount: transaction.args.amount?.toString(),
    txValue: tx.value,
  };

  return normalizeUniAssets(
    finishSwap(decodeUniversalRouter(transaction, tx.chainId, ctx)),
    tx.chainId,
    native
  );
};
