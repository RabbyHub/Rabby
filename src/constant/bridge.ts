export const DEFAULT_BRIDGE_SUPPORTED_CHAIN = [
  'arb',
  'matic',
  'era',
  'base',
  'op',
  'linea',
  'xdai',
  'eth',
  'mnt',
  'mode',
  'bsc',
  'scrl',
  'avax',
  'zora',
];

export const DEFAULT_BRIDGE_AGGREGATOR = [
  {
    id: 'bungee',
    name: 'Bungee',
    logo_url:
      'https://static.debank.com/image/project/logo_url/op_bungee/0f25166d72b1c552f6acc16b90345464.png',
    bridge_list: [
      {
        id: 'base-bridge',
        name: 'Base',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/cc84a9e0457f1049b1d15dadfd2a7ee9/cc84a9e0457f1049b1d15dadfd2a7ee9.png',
      },
      {
        id: 'mantle-native-bridge',
        name: 'Mantle Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/46f1a95cb0823639f037383dfc19115b/46f1a95cb0823639f037383dfc19115b.png',
      },
      {
        id: 'cctp',
        name: 'Circle CCTP',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/cd1a5ceb398d491dd03836c43dddc471/cd1a5ceb398d491dd03836c43dddc471.png',
      },
      {
        id: 'zora-bridge',
        name: 'Zora',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/5414b373d9c2111ea48c73294626b8a0/5414b373d9c2111ea48c73294626b8a0.png',
      },
      {
        id: 'arbitrum-bridge',
        name: 'Arbitrum',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/d7dbe968da9ad5ea006808e5372c8618/d7dbe968da9ad5ea006808e5372c8618.png',
      },
      {
        id: 'across',
        name: 'Across',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/cc446f8ac61966c9640852aa0ad53468/cc446f8ac61966c9640852aa0ad53468.png',
      },
      {
        id: 'gnosis-native-bridge',
        name: 'Gnosis Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7c6461546fbf750179eeb5fa1fc06be8/7c6461546fbf750179eeb5fa1fc06be8.png',
      },
      {
        id: 'hyphen',
        name: 'Hyphen',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7ed84e73706f779af2b022ceb3c1cb95/7ed84e73706f779af2b022ceb3c1cb95.png',
      },
      {
        id: 'optimism-bridge',
        name: 'Optimism',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/b10597a12fbe424bf2f519f31d3962ad/b10597a12fbe424bf2f519f31d3962ad.png',
      },
      {
        id: 'mode-native-bridge',
        name: 'Mode Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/358cc95c7825ab21c98fff5fac1fa759/358cc95c7825ab21c98fff5fac1fa759.png',
      },
      {
        id: 'scroll-native-bridge',
        name: 'Scroll Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/abe9a451211ce2a158b54b79c98d2ea3/abe9a451211ce2a158b54b79c98d2ea3.png',
      },
      {
        id: 'polygon-bridge',
        name: 'Polygon POS',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/c364ee023349579f28c0f7c176bc3fac/c364ee023349579f28c0f7c176bc3fac.png',
      },
      {
        id: 'refuel-bridge',
        name: 'Refuel',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/ead1d90ef86fec7f28dfbd0ca203f48b/ead1d90ef86fec7f28dfbd0ca203f48b.png',
      },
      {
        id: 'zksync-native',
        name: 'ZkSync',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/fc0fcd6e93a6c02e2aa2772fb38465ae/fc0fcd6e93a6c02e2aa2772fb38465ae.png',
      },
    ],
  },
  {
    id: 'lifi',
    name: 'Li.fi',
    logo_url:
      'https://static.debank.com/image/project/logo_url/lifiprotocol/22262cb8c3879421c841c1e1e8c468ee.png',
    bridge_list: [
      {
        id: 'hyphen',
        name: 'Hyphen',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7ed84e73706f779af2b022ceb3c1cb95/7ed84e73706f779af2b022ceb3c1cb95.png',
      },
      {
        id: 'gnosis',
        name: 'Gnosis Bridge',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7c6461546fbf750179eeb5fa1fc06be8/7c6461546fbf750179eeb5fa1fc06be8.png',
      },
      {
        id: 'arbitrum',
        name: 'Arbitrum Bridge',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/d7dbe968da9ad5ea006808e5372c8618/d7dbe968da9ad5ea006808e5372c8618.png',
      },
      {
        id: 'celercircle',
        name: 'Circle CCTP',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/cd1a5ceb398d491dd03836c43dddc471/cd1a5ceb398d491dd03836c43dddc471.png',
      },
      {
        id: 'optimism',
        name: 'Optimism Gateway',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/b10597a12fbe424bf2f519f31d3962ad/b10597a12fbe424bf2f519f31d3962ad.png',
      },
      {
        id: 'omni',
        name: 'Omni Bridge',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/0638c112ea4c235061e82c57dc092673/0638c112ea4c235061e82c57dc092673.png',
      },
      {
        id: 'across',
        name: 'Across',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/cc446f8ac61966c9640852aa0ad53468/cc446f8ac61966c9640852aa0ad53468.png',
      },
    ],
  },
];
