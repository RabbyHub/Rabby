import { CHAINS_ENUM } from '@debank/common';

const wrapperToken = {
  [CHAINS_ENUM.ETH]: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  [CHAINS_ENUM.AVAX]: {
    name: 'Wrapped AVAX',
    symbol: 'WAVAX',
    address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    origin: {
      name: 'AVAX',
      symbol: 'AVAX',
    },
  },
  [CHAINS_ENUM.BASE]: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  [CHAINS_ENUM.ARBITRUM]: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  [CHAINS_ENUM.LINEA]: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  ['SONIC']: {
    name: 'Wrapped Sonic',
    symbol: 'WS',
    address: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',
    origin: {
      name: 'Sonic',
      symbol: 'S',
    },
  },
  ['OP']: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  PLASMA: {
    name: 'Wrapped XPL',
    symbol: 'WXPL',
    address: '0x6100e367285b01f48d07953803a2d8dca5d19873',
    origin: {
      name: 'XPL',
      symbol: 'XPL',
    },
  },
  [CHAINS_ENUM.POLYGON]: {
    name: 'Wrapped POL',
    symbol: 'WPOL',
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    origin: {
      name: 'POL',
      symbol: 'POL',
    },
  },
  INK: {
    name: 'Wrapped INK',
    symbol: 'WINK',
    address: '0x4200000000000000000000000000000000000006',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  [CHAINS_ENUM.GNOSIS]: {
    name: 'Wrapped Gnosis',
    symbol: 'WXDAI',
    address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    origin: {
      name: 'Gnosis',
      symbol: 'XDAI',
    },
  },
  BSC: {
    name: 'Wrapped BNB',
    symbol: 'WBNB',
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    origin: {
      name: 'BNB',
      symbol: 'BNB',
    },
  },
  [CHAINS_ENUM.SCRL]: {
    name: 'Wrapped ETH',
    symbol: 'WETH',
    address: '0x5300000000000000000000000000000000000004',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  [CHAINS_ENUM.ERA]: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
  SONEIUM: {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    origin: {
      name: 'Ether',
      symbol: 'ETH',
    },
  },
};

export default wrapperToken;
