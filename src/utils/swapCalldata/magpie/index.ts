import { CHAINS } from '@debank/common';
import { utils } from 'ethers';
import { CalldataDecodeError, decodeAt } from '../errors';
import type { DecodeCalldataResult, TxWithChainId } from '../types';
import { isSameAddress, NULL_ADDRESS, resolveToTokenReceiver } from '../utils';
import { MagpieABI } from './abi';
import { decodeDexAggregator } from './dexAggregator';
import { PackedReader, PackedSwap } from './packed';
import { decodeRouterV2 } from './routerV2';
import { decodeRouterV3 } from './routerV3';

const magpieInterface = new utils.Interface(MagpieABI);
const versions: Record<
  string,
  { step: string; decode: (data: PackedReader) => PackedSwap }
> = {
  swap: { step: 'decode.magpie.routerV2', decode: decodeRouterV2 },
  silentSwap: { step: 'decode.magpie.routerV2', decode: decodeRouterV2 },
  swapWithMagpieSignature: {
    step: 'decode.magpie.routerV3',
    decode: decodeRouterV3,
  },
  swapWithUserSignature: {
    step: 'decode.magpie.routerV3',
    decode: decodeRouterV3,
  },
  swapWithBackendSignature: {
    step: 'decode.magpie.dexAggregator',
    decode: decodeDexAggregator,
  },
};

export const decodeCalldata = (
  tx: TxWithChainId
): DecodeCalldataResult | null => {
  const chain = Object.values(CHAINS).find((item) => item.id === tx.chainId);
  if (!chain) return null;

  const selector = tx.data.slice(0, 10).toLowerCase();
  const knownSelector = Object.values(magpieInterface.functions).some(
    (fragment) => magpieInterface.getSighash(fragment) === selector
  );
  if (!knownSelector) {
    throw new CalldataDecodeError(
      'decode.transactionABI',
      `Unsupported Magpie calldata selector: ${selector}`
    );
  }
  const transaction = decodeAt('decode.transactionABI', () =>
    magpieInterface.parseTransaction({ data: tx.data })
  );
  const version = versions[transaction.name];
  const payloadLength = utils.arrayify(transaction.args[0]).length;
  const swap = version.decode(
    new PackedReader(tx.data, payloadLength, version.step)
  );

  return {
    fromToken: isSameAddress(swap.fromAsset, NULL_ADDRESS)
      ? chain.nativeTokenAddress
      : swap.fromAsset,
    fromTokenAmount: swap.amountIn,
    toToken: isSameAddress(swap.toAsset, NULL_ADDRESS)
      ? chain.nativeTokenAddress
      : swap.toAsset,
    minReceiveToTokenAmount: swap.amountOutMin,
    toTokenReceiver: resolveToTokenReceiver(swap.receiver, tx.from),
  };
};
