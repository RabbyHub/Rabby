import { utils } from 'ethers';
import { getNativeTokenAddress } from '../chain';
import { CalldataDecodeError, decodeAt } from '../errors';
import type {
  DecodeCalldataOptions,
  DecodeCalldataResult,
  TxWithChainId,
} from '../types';
import { isSameAddress, NULL_ADDRESS, resolveToTokenReceiver } from '../utils';
import { MagpieABI } from './abi';
import { decodeDexAggregator } from './dexAggregator';
import { PackedReader } from './packed';

const magpieInterface = new utils.Interface(MagpieABI);
const dexAggregatorSelector = magpieInterface.getSighash(
  'swapWithBackendSignature'
);

export const getVersion = (tx: TxWithChainId) =>
  tx.data.slice(0, 10).toLowerCase() === dexAggregatorSelector
    ? 'DexAggregator'
    : 'unknown';

export const decodeCalldata = (
  tx: TxWithChainId,
  options: DecodeCalldataOptions = {}
): DecodeCalldataResult | null => {
  const native = getNativeTokenAddress(tx.chainId, options.nativeTokenAddress);

  const selector = tx.data.slice(0, 10).toLowerCase();
  if (selector !== dexAggregatorSelector) {
    throw new CalldataDecodeError(
      'decode.transactionABI',
      `Unsupported Magpie calldata selector: ${selector}`
    );
  }
  const transaction = decodeAt('decode.transactionABI', () =>
    magpieInterface.parseTransaction({ data: tx.data })
  );
  const payloadLength = utils.arrayify(transaction.args[0]).length;
  const swap = decodeDexAggregator(
    new PackedReader(tx.data, payloadLength, 'decode.magpie.dexAggregator')
  );

  return {
    fromToken: isSameAddress(swap.fromAsset, NULL_ADDRESS)
      ? native
      : swap.fromAsset,
    fromTokenAmount: swap.amountIn,
    toToken: isSameAddress(swap.toAsset, NULL_ADDRESS) ? native : swap.toAsset,
    minReceiveToTokenAmount: swap.amountOutMin,
    toTokenReceiver: resolveToTokenReceiver(swap.receiver, tx.from),
  };
};
