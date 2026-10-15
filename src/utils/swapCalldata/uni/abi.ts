export const UniversalRouterABI = [
  'function execute(bytes commands, bytes[] inputs) payable',
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable',
  'function executeSigned(bytes commands, bytes[] inputs, bytes32 intent, bytes32 data, bool verifySender, bytes32 nonce, bytes signature, uint256 deadline) payable',
];

export const SwapProxyABI = [
  'function execute(address router, address token, uint256 amount, bytes commands, bytes[] inputs, uint256 deadline)',
];

// The original V3 SwapRouter includes deadline inside each swap tuple.
export const SwapRouterABI = [
  'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256)',
  'function exactOutputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountOut,uint256 amountInMaximum,uint160 sqrtPriceLimitX96) params) payable returns (uint256)',
  'function exactInput(tuple(bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum) params) payable returns (uint256)',
  'function exactOutput(tuple(bytes path,address recipient,uint256 deadline,uint256 amountOut,uint256 amountInMaximum) params) payable returns (uint256)',
];

// SwapRouter02 removes the per-swap deadline and adds V2 swaps.
export const SwapRouter02ABI = [
  'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256)',
  'function exactOutputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountOut,uint256 amountInMaximum,uint160 sqrtPriceLimitX96) params) payable returns (uint256)',
  'function exactInput(tuple(bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) payable returns (uint256)',
  'function exactOutput(tuple(bytes path,address recipient,uint256 amountOut,uint256 amountInMaximum) params) payable returns (uint256)',
  'function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to) payable returns (uint256)',
  'function swapTokensForExactTokens(uint256 amountOut,uint256 amountInMax,address[] path,address to) payable returns (uint256)',
];

export const V2RouterABI = [
  'function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns (uint256[])',
  'function swapTokensForExactTokens(uint256 amountOut,uint256 amountInMax,address[] path,address to,uint256 deadline) returns (uint256[])',
  'function swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable returns (uint256[])',
  'function swapETHForExactTokens(uint256 amountOut,address[] path,address to,uint256 deadline) payable returns (uint256[])',
  'function swapExactTokensForETH(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline) returns (uint256[])',
  'function swapTokensForExactETH(uint256 amountOut,uint256 amountInMax,address[] path,address to,uint256 deadline) returns (uint256[])',
];

export const MulticallABI = [
  'function multicall(bytes[] data) payable returns (bytes[])',
  'function multicall(uint256 deadline,bytes[] data) payable returns (bytes[])',
  'function multicall(bytes32 previousBlockhash,bytes[] data) payable returns (bytes[])',
];

export const RouterPaymentsABI = [
  'function unwrapWETH9(uint256 amountMinimum,address recipient) payable',
  'function unwrapWETH9(uint256 amountMinimum) payable',
  'function sweepToken(address token,uint256 amountMinimum,address recipient) payable',
  'function sweepToken(address token,uint256 amountMinimum) payable',
  'function wrapETH(uint256 value) payable',
  'function pull(address token,uint256 value) payable',
  'function refundETH() payable',
  'function selfPermit(address token,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s) payable',
  'function selfPermitIfNecessary(address token,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s) payable',
  'function selfPermitAllowed(address token,uint256 nonce,uint256 expiry,uint8 v,bytes32 r,bytes32 s) payable',
  'function selfPermitAllowedIfNecessary(address token,uint256 nonce,uint256 expiry,uint8 v,bytes32 r,bytes32 s) payable',
];

export const UniABI = [
  ...UniversalRouterABI,
  ...SwapProxyABI,
  ...SwapRouterABI,
  ...SwapRouter02ABI,
  ...V2RouterABI,
  ...MulticallABI,
  ...RouterPaymentsABI,
];
