import { PackedReader, PackedSwap } from './packed';

// MagpieRouterV3 / V3_1 LibRouter.getData(). Verified V3_1 deployments
// on Arbitrum and BSC use the same offsets for these fields.
export const decodeRouterV3 = (data: PackedReader): PackedSwap => ({
  receiver: data.address(72, 'receiver'),
  fromAsset: data.address(92, 'fromAsset'),
  toAsset: data.address(112, 'toAsset'),
  amountIn: data.compact(141, 142, 'amountIn'),
  amountOutMin: data.compact(135, 136, 'amountOutMin'),
});
