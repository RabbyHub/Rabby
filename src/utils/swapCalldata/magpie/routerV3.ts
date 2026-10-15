import { PackedReader, PackedSwap } from './packed';

// Verified MagpieRouterV3 (Base/BSC) and V3_1 (Arbitrum/BSC)
// LibRouter.getData() use the same offsets for these fields.
export const decodeRouterV3 = (data: PackedReader): PackedSwap => ({
  receiver: data.address(72, 'receiver'),
  fromAsset: data.address(92, 'fromAsset'),
  toAsset: data.address(112, 'toAsset'),
  amountIn: data.compact(141, 142, 'amountIn'),
  amountOutMin: data.compact(135, 136, 'amountOutMin'),
});
