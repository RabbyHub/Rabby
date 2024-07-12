export const DEFAULT_BRIDGE_SUPPORTED_CHAIN = [
  'eth',
  'mobm',
  'base',
  'movr',
  'linea',
  'matic',
  'op',
  'mode',
  'mnt',
  'rsk',
  'boba',
  'arb',
  'blast',
  'bsc',
  'metis',
  'era',
  'pze',
  'scrl',
  'aurora',
  'xdai',
  'avax',
  'ftm',
  'celo',
  'zora',
  'fuse',
  'frax',
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
          'https://static.debank.com/image/bridge/logo_url/e514b104d82e3a0cb5537681d6845c6b/e514b104d82e3a0cb5537681d6845c6b.png',
      },
      {
        id: 'mantle-native-bridge',
        name: 'Mantle Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/d7683a5b68c00fd90828709dc7d08fdb/d7683a5b68c00fd90828709dc7d08fdb.png',
      },
      {
        id: 'cctp',
        name: 'Circle CCTP',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/17197a58a50ed6e294a725dda3fad872/17197a58a50ed6e294a725dda3fad872.png',
      },
      {
        id: 'zora-bridge',
        name: 'Zora',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/d1a5c2ccd94a45c844d1eafc43bc6202/d1a5c2ccd94a45c844d1eafc43bc6202.png',
      },
      {
        id: 'arbitrum-bridge',
        name: 'Arbitrum',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/67237107afb53d176754926ec81e5a1c/67237107afb53d176754926ec81e5a1c.png',
      },
      {
        id: 'across',
        name: 'Across',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/82cb74da444862e7262ef3b6143cbcb4/82cb74da444862e7262ef3b6143cbcb4.png',
      },
      {
        id: 'gnosis-native-bridge',
        name: 'Gnosis Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/e303cef874ceb6d7b0112dd5650e5bf1/e303cef874ceb6d7b0112dd5650e5bf1.png',
      },
      {
        id: 'hyphen',
        name: 'Hyphen',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/c23e9bda45a45b043d7238b533439018/c23e9bda45a45b043d7238b533439018.png',
      },
      {
        id: 'optimism-bridge',
        name: 'Optimism',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7a18168471ca584bc0162c8806392b76/7a18168471ca584bc0162c8806392b76.png',
      },
      {
        id: 'mode-native-bridge',
        name: 'Mode Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/c91a2e28e7ba67c6d95f16a16e1f6ffe/c91a2e28e7ba67c6d95f16a16e1f6ffe.png',
      },
      {
        id: 'scroll-native-bridge',
        name: 'Scroll Native',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/9e583479dc65b95460c9790e2cc909b9/9e583479dc65b95460c9790e2cc909b9.png',
      },
      {
        id: 'polygon-bridge',
        name: 'Polygon POS',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/36b3e9e58e16beab418b0332fd0accfd/36b3e9e58e16beab418b0332fd0accfd.png',
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
          'https://static.debank.com/image/bridge/logo_url/2e46e772be0b0c3715958a3c4c934792/2e46e772be0b0c3715958a3c4c934792.png',
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
          'https://static.debank.com/image/bridge/logo_url/4f08b730ca9c62f9bfd5fcb737680dfb/4f08b730ca9c62f9bfd5fcb737680dfb.png',
      },
      {
        id: 'gnosis',
        name: 'Gnosis Bridge',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/796e87d181abdf433aca922613384ad8/796e87d181abdf433aca922613384ad8.png',
      },
      {
        id: 'arbitrum',
        name: 'Arbitrum Bridge',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/325af805bf8f830f3bacd15ba97d0652/325af805bf8f830f3bacd15ba97d0652.png',
      },
      {
        id: 'celercircle',
        name: 'Circle CCTP',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/58dc0ae7627e0f7f12eb4bc8a259bcde/58dc0ae7627e0f7f12eb4bc8a259bcde.png',
      },
      {
        id: 'optimism',
        name: 'Optimism Gateway',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7d0de3c35bc9699a7ca1a178af7102ff/7d0de3c35bc9699a7ca1a178af7102ff.png',
      },
      {
        id: 'omni',
        name: 'Omni Bridge',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/7f4c137cd1fd03dd8ea99801b1214ae9/7f4c137cd1fd03dd8ea99801b1214ae9.png',
      },
      {
        id: 'across',
        name: 'Across',
        logo_url:
          'https://static.debank.com/image/bridge/logo_url/82cb74da444862e7262ef3b6143cbcb4/82cb74da444862e7262ef3b6143cbcb4.png',
      },
    ],
  },
];
