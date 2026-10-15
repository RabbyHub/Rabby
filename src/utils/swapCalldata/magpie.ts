import { CHAINS } from '@debank/common';
import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import type { DecodeCalldataResult, TxWithChainId } from './types';
import { MagpieABI } from './abi';
import { isSameAddress, NULL_ADDRESS, resolveToTokenReceiver } from './utils';

const { Interface } = utils;

// Extracted from @rabby-wallet/rabby-swap@0.0.88-alpha.0 for local iteration.
const magpieInterface = new Interface(MagpieABI);

// MagpieRouterV3 LibRouter.getData() 用绝对 calldata 偏移，不是 ABI tuple。
// swapWithMagpieSignature(bytes) 标准编码下 bytes 从第 68 字节开始。
const Packed = {
  toAddress: 72,
  fromAsset: 92,
  toAsset: 112,
  amountOutMin: { shift: 135, ptr: 136 },
  amountIn: { shift: 141, ptr: 142 },
};

const readCompactUint = (
  hex: string,
  field: { shift: number; ptr: number }
) => {
  const shiftBits = hex.slice(field.shift * 2, field.shift * 2 + 2);
  const wordOffset = hex.slice(field.ptr * 2, field.ptr * 2 + 4);
  if (shiftBits.length !== 2 || wordOffset.length !== 4) return null;
  const word = hex.slice(
    parseInt(wordOffset, 16) * 2,
    parseInt(wordOffset, 16) * 2 + 64
  );
  if (word.length !== 64) return null;
  return new BigNumber(word, 16)
    .idiv(new BigNumber(2).pow(parseInt(shiftBits, 16)))
    .toFixed(0);
};

export const decodeCalldata = (
  tx: TxWithChainId
): DecodeCalldataResult | null => {
  const chain = Object.values(CHAINS).find((item) => item.id === tx.chainId);
  if (!chain) return null;

  const result = magpieInterface.parseTransaction({ data: tx.data });
  if (result.name !== 'swapWithMagpieSignature') return null;

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
  const amountOutMin = readCompactUint(hex, Packed.amountOutMin);
  const amountIn = readCompactUint(hex, Packed.amountIn);

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
