import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import { getNativeTokenAddress } from '../chain';
import { CalldataDecodeError, decodeAt } from '../errors';
import type {
  DecodeCalldataOptions,
  DecodeCalldataResult,
  TxWithChainId,
} from '../types';
import { isSameAddress, NULL_ADDRESS } from '../utils';
import { MagpieABI } from './abi';
import {
  decodeDexAggregator,
  decodeDexAggregatorInputFee,
} from './dexAggregator';
import { PackedReader } from './packed';

const magpieInterface = new utils.Interface(MagpieABI);
const dexAggregatorSelector = magpieInterface.getSighash(
  'swapWithBackendSignature'
);

export const getVersion = (tx: TxWithChainId) =>
  tx.data.slice(0, 10).toLowerCase() === dexAggregatorSelector
    ? 'DexAggregator'
    : 'unknown';

const readPayload = (tx: TxWithChainId): PackedReader => {
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
  return new PackedReader(
    tx.data,
    payloadLength,
    'decode.magpie.dexAggregator'
  );
};

export const decodeInputFee = (tx: TxWithChainId): string =>
  decodeDexAggregatorInputFee(readPayload(tx));

export const decodeCalldata = (
  tx: TxWithChainId,
  options: DecodeCalldataOptions = {}
): DecodeCalldataResult => {
  const native = getNativeTokenAddress(tx.chainId, options.nativeTokenAddress);
  const payload = readPayload(tx);
  const swap = decodeDexAggregator(payload);
  const nativeInput = isSameAddress(swap.fromAsset, NULL_ADDRESS);
  let amountIn = new BigNumber(swap.amountIn);
  // DexAggregator.adjustAmountIn(): zero means automatic input, not a zero
  // debit. Native input is known from value minus encoded native fees;
  // ERC20 input depends on min(balance, allowance), unavailable offline.
  // https://sourcify.dev/server/v2/contract/42161/0x20F6ee51340aDEed01A59B0e65cB3703f3dc860c?fields=sources
  const inputFee = nativeInput ? decodeDexAggregatorInputFee(payload) : '0';
  if (amountIn.isZero()) {
    if (!nativeInput)
      throw new CalldataDecodeError(
        'decode.magpie.dexAggregator.amountIn',
        'Automatic ERC20 input depends on onchain balance and allowance; it cannot be determined from calldata alone'
      );
    amountIn = new BigNumber(tx.value).minus(inputFee);
  }
  if (!amountIn.gt(0))
    throw new CalldataDecodeError(
      'decode.magpie.dexAggregator.amountIn',
      'Original input amount is zero or unresolved'
    );
  if (nativeInput && !amountIn.plus(inputFee).eq(tx.value))
    throw new CalldataDecodeError(
      'decode.magpie.dexAggregator.nativeValue',
      'Native transaction value does not equal input amount plus encoded native fees'
    );

  return {
    fromToken: isSameAddress(swap.fromAsset, NULL_ADDRESS)
      ? native
      : swap.fromAsset,
    fromTokenAmount: amountIn.toFixed(0),
    toToken: isSameAddress(swap.toAsset, NULL_ADDRESS) ? native : swap.toAsset,
    minReceiveToTokenAmount: swap.amountOutMin,
    // LibRouter reads toAddress literally; zero is not a msg.sender sentinel.
    toTokenReceiver: swap.receiver,
  };
};
