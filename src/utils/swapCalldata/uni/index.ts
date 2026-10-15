import { CHAINS } from '@debank/common';
import { utils } from 'ethers';
import { decodeAt } from '../errors';
import type { DecodeCalldataResult, TxWithChainId } from '../types';
import { UniABI } from './abi';
import { Context, finishSwap } from './shared';
import { decodeSwapRouter } from './swapRouter';
import { decodeUniversalRouter } from './universalRouter';

const uniInterface = new utils.Interface(UniABI);

export const decodeCalldata = (
  tx: TxWithChainId
): DecodeCalldataResult | null => {
  const chain = Object.values(CHAINS).find((item) => item.id === tx.chainId);
  if (!chain) return null;
  const transaction = decodeAt('decode.transactionABI', () =>
    uniInterface.parseTransaction({ data: tx.data })
  );
  const ctx: Context = {
    native: chain.nativeTokenAddress,
    sender: tx.from,
    // SwapProxy passes the actual Universal Router as an explicit argument.
    router: transaction.args.router || tx.to,
    proxyToken: transaction.args.token,
    proxyAmount: transaction.args.amount?.toString(),
    txValue: tx.value,
  };

  const universal =
    transaction.name === 'execute' || transaction.name === 'executeSigned';
  return finishSwap(
    universal
      ? decodeUniversalRouter(transaction, tx.chainId, ctx)
      : decodeSwapRouter(tx.data, ctx)
  );
};
