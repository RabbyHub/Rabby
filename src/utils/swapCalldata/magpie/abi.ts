export const MagpieV2ABI = [
  'function swap(bytes swapArgs) payable returns (uint256 amountOut)',
  'function silentSwap(bytes swapArgs) payable returns (uint256 amountOut)',
];

export const MagpieV3ABI = [
  'function swapWithMagpieSignature(bytes swapData) payable returns (uint256 amountOut)',
  'function swapWithUserSignature(bytes swapData) payable returns (uint256 amountOut)',
];

export const DexAggregatorABI = [
  'function swapWithBackendSignature(bytes swapData) payable returns (uint256 amountOut)',
];

export const MagpieABI = [...MagpieV2ABI, ...MagpieV3ABI, ...DexAggregatorABI];
