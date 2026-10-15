import { CHAINS } from '@debank/common';
import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import type { DecodeCalldataResult, TxWithChainId } from './types';
import { MagpieABI } from './abi';
import { isSameAddress, NULL_ADDRESS, resolveToTokenReceiver } from './utils';

const { Interface } = utils;

const magpieInterface = new Interface(MagpieABI);

// Both contracts use absolute calldata offsets; the bytes argument starts at 68.
const Packed = {
  toAddress: 72,
  fromAsset: 92,
  toAsset: 112,
};

const readUint = (hex: string, offset: number) => {
  const word = hex.slice(offset * 2, offset * 2 + 64);
  return word.length === 64 ? new BigNumber(word, 16).toFixed(0) : null;
};

const readCompactUint = (
  hex: string,
  field: { shift: number; ptr: number }
) => {
  const shiftBits = hex.slice(field.shift * 2, field.shift * 2 + 2);
  const wordOffset = hex.slice(field.ptr * 2, field.ptr * 2 + 4);
  if (shiftBits.length !== 2 || wordOffset.length !== 4) return null;
  const word = readUint(hex, parseInt(wordOffset, 16));
  if (word === null) return null;
  return new BigNumber(word)
    .idiv(new BigNumber(2).pow(parseInt(shiftBits, 16)))
    .toFixed(0);
};

// Preserve the MagpieRouterV3 layout copied from rabby-swap@0.0.88-alpha.0.
const decodeMagpieRouterV3 = (hex: string) => ({
  amountIn: readCompactUint(hex, { shift: 141, ptr: 142 }),
  amountOutMin: readCompactUint(hex, { shift: 135, ptr: 136 }),
});

// DexAggregator LibRouter.getData(): amountIn is a full uint256, not a pointer.
// Verified Arbitrum source:
// https://sourcify.dev/server/v2/contract/42161/0x20F6ee51340aDEed01A59B0e65cB3703f3dc860c?fields=sources
const decodeDexAggregator = (hex: string) => ({
  amountIn: readUint(hex, 132),
  amountOutMin: readCompactUint(hex, { shift: 167, ptr: 168 }),
});

const amountDecoders = {
  [magpieInterface.getSighash('swapWithMagpieSignature')]: decodeMagpieRouterV3,
  [magpieInterface.getSighash('swapWithBackendSignature')]: decodeDexAggregator,
};

export const decodeCalldata = (
  tx: TxWithChainId
): DecodeCalldataResult | null => {
  const chain = Object.values(CHAINS).find((item) => item.id === tx.chainId);
  if (!chain) return null;

  const selector = tx.data.slice(0, 10).toLowerCase();
  const decodeAmounts = amountDecoders[selector];
  if (!decodeAmounts) {
    throw new Error(`Unsupported Magpie calldata selector: ${selector}`);
  }
  magpieInterface.parseTransaction({ data: tx.data });

  const hex = tx.data.replace(/^0x/i, '').toLowerCase();
  if (hex.length < (Packed.toAsset + 20) * 2) return null;
  const toAddress = `0x${hex.slice(
    Packed.toAddress * 2,
    (Packed.toAddress + 20) * 2
  )}`;
  const fromAsset = `0x${hex.slice(
    Packed.fromAsset * 2,
    (Packed.fromAsset + 20) * 2
  )}`;
  const toAsset = `0x${hex.slice(
    Packed.toAsset * 2,
    (Packed.toAsset + 20) * 2
  )}`;
  const { amountIn, amountOutMin } = decodeAmounts(hex);

  if (!amountOutMin || !amountIn) {
    return null;
  }

  return {
    fromToken: isSameAddress(fromAsset, NULL_ADDRESS)
      ? chain.nativeTokenAddress
      : fromAsset,
    fromTokenAmount: amountIn,
    toToken: isSameAddress(toAsset, NULL_ADDRESS)
      ? chain.nativeTokenAddress
      : toAsset,
    minReceiveToTokenAmount: amountOutMin,
    toTokenReceiver: resolveToTokenReceiver(toAddress, tx.from),
  };
};
