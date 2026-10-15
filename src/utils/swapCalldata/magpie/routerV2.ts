import BigNumber from 'bignumber.js';
import { CalldataDecodeError } from '../errors';
import { PackedReader, PackedSwap } from './packed';

// MagpieRouterV2 LibSwap.getData(), verified on Arbitrum at both
// 0xbd96bca0d3a4fcc18dc44d333a7851c513772289 and 0xcf32c5bb41f7a302298a2d2072155800871baad3.
export const decodeRouterV2 = (data: PackedReader): PackedSwap => {
  const dataOffset = 72;
  const dataLength = Number(data.uint(68, 'dataLength', 2));
  const amountsLength = Number(data.uint(70, 'amountsLength', 2));
  if (dataLength < 158 || amountsLength === 0 || amountsLength % 2 !== 0) {
    throw new CalldataDecodeError(
      'decode.magpie.routerV2.header',
      'Invalid V2 data length or amount-pointer list'
    );
  }

  const amountsOffset = dataOffset + dataLength;
  let amountIn = new BigNumber(0);
  for (
    let offset = amountsOffset;
    offset < amountsOffset + amountsLength;
    offset += 2
  ) {
    const pointer = Number(data.uint(offset, 'amountIn.pointer', 2));
    amountIn = amountIn.plus(data.uint(pointer, 'amountIn'));
  }

  return {
    receiver: data.address(dataOffset + 34, 'receiver'),
    fromAsset: data.address(dataOffset + 54, 'fromAsset'),
    toAsset: data.address(dataOffset + 74, 'toAsset'),
    amountIn: amountIn.toFixed(0),
    amountOutMin: data.uint(dataOffset + 126, 'amountOutMin'),
  };
};
