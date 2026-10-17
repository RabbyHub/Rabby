import { SwapRouter } from '@uniswap/universal-router-sdk';

// The current quote flow uses execute directly or through SwapProxy.
// Keep the official ABI as the source of truth, excluding signed execution.
export const UniversalRouterABI = Object.values(
  SwapRouter.INTERFACE.functions
).filter((fragment) => fragment.name === 'execute');
export const SwapProxyABI = Object.values(SwapRouter.PROXY_INTERFACE.functions);
export const UniABI = [...UniversalRouterABI, ...SwapProxyABI];
