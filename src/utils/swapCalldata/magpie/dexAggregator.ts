import { PackedReader, PackedSwap } from './packed';

// DexAggregator LibRouter.getData(), verified Arbitrum source:
// https://sourcify.dev/server/v2/contract/42161/0x20F6ee51340aDEed01A59B0e65cB3703f3dc860c?fields=sources
export const decodeDexAggregator = (data: PackedReader): PackedSwap => ({
  receiver: data.address(72, 'receiver'),
  fromAsset: data.address(92, 'fromAsset'),
  toAsset: data.address(112, 'toAsset'),
  amountIn: data.uint(132, 'amountIn'),
  amountOutMin: data.compact(167, 168, 'amountOutMin'),
});
