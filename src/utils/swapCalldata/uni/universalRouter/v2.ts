import { Token, V2_FACTORY_ADDRESSES } from '@uniswap/sdk-core';
import { computePairAddress } from '@uniswap/v2-sdk';
import { decodeAt } from '../../errors';

// A mixed route can pay directly into the next V2 pair instead of the Router.
// Use the official chain-specific factory and CREATE2 derivation; never guess a
// mainnet factory when deployment metadata is missing.
// https://github.com/Uniswap/sdks/blob/main/sdks/universal-router-sdk/src/entities/actions/uniswap.ts
// https://github.com/Uniswap/sdks/blob/main/sdks/v2-sdk/src/entities/pair.ts
export const getV2InputPair = (
  chainId: number,
  path: readonly string[],
  step: string
): string | undefined => {
  const factoryAddress = V2_FACTORY_ADDRESSES[chainId];
  if (!factoryAddress) return undefined;
  return decodeAt(`${step}.inputPair`, () =>
    computePairAddress({
      factoryAddress,
      // Only chain and addresses participate in CREATE2; decimals are unused.
      tokenA: new Token(chainId, path[0], 0),
      tokenB: new Token(chainId, path[1], 0),
    })
  );
};
