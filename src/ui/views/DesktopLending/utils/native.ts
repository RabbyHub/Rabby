const wrappedNativeCurrencyEth = {
  decimals: 18,
  name: 'Wrapped Ether',
  symbol: 'WETH',
};

const getWrappedTokenForChain = (
  chainId: number,
  address: string,
  info: { decimals: number; name: string; symbol: string }
) => {
  return {
    chainId,
    address,
    ...info,
  };
};

export const WRAPPED_NATIVE_CURRENCIES = {
  [1 /* MAINNET */]: getWrappedTokenForChain(
    1 /* MAINNET */,
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    wrappedNativeCurrencyEth
  ),
  [100 /* GNOSIS_CHAIN */]: getWrappedTokenForChain(
    100 /* GNOSIS_CHAIN */,
    '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    {
      decimals: 18,
      name: 'Wrapped XDAI',
      symbol: 'WXDAI',
    }
  ),
  [42161 /* ARBITRUM_ONE */]: getWrappedTokenForChain(
    42161 /* ARBITRUM_ONE */,
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    wrappedNativeCurrencyEth
  ),
  [8453 /* BASE */]: getWrappedTokenForChain(
    8453 /* BASE */,
    '0x4200000000000000000000000000000000000006',
    wrappedNativeCurrencyEth
  ),
  [11155111 /* SEPOLIA */]: getWrappedTokenForChain(
    11155111 /* SEPOLIA */,
    '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    wrappedNativeCurrencyEth
  ),
  [137 /* POLYGON */]: getWrappedTokenForChain(
    137 /* POLYGON */,
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    {
      decimals: 18,
      name: 'Wrapped POL',
      symbol: 'WPOL',
    }
  ),
  [43114 /* AVALANCHE */]: getWrappedTokenForChain(
    43114 /* AVALANCHE */,
    '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    {
      decimals: 18,
      name: 'Wrapped AVAX',
      symbol: 'WAVAX',
    }
  ),
  [232 /* LENS */]: getWrappedTokenForChain(
    232 /* LENS */,
    '0x6bdc36e20d267ff0dd6097799f82e78907105e2f',
    {
      decimals: 18,
      name: 'Wrapped GHO',
      symbol: 'WGHO',
    }
  ),
  [56 /* BNB */]: getWrappedTokenForChain(
    56 /* BNB */,
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    {
      decimals: 18,
      name: 'Wrapped BNB',
      symbol: 'WBNB',
    }
  ),
  [9745 /* PLASMA */]: getWrappedTokenForChain(
    9745 /* PLASMA */,
    '0x6100e367285b01f48d07953803a2d8dca5d19873',
    {
      decimals: 18,
      name: 'Wrapped XPL',
      symbol: 'WXPL',
    }
  ),
  [59144 /* LINEA */]: getWrappedTokenForChain(
    59144 /* LINEA */,
    '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f',
    wrappedNativeCurrencyEth
  ),
};

/**
 * Supported chains and their `chainId` for the SDK.
 *
 * A supported chain, is a chain where CoW Protocol is deployed, so you can sell tokens from there.
 *
 * @enum
 */
export const enum SupportedChainId {
  MAINNET = 1,
  BNB = 56,
  GNOSIS_CHAIN = 100,
  POLYGON = 137,
  LENS = 232,
  BASE = 8453,
  PLASMA = 9745,
  ARBITRUM_ONE = 42161,
  AVALANCHE = 43114,
  LINEA = 59144,
  SEPOLIA = 11155111,
}
