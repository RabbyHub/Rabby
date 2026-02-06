import { CustomMarket } from './market';

const unfoldTokenSymbols = {
  // Core
  [CustomMarket.proto_mainnet_v3]: [
    'usdt',
    'usde',
    'usdc',
    'usds',
    'weth',
    'eth',
    'dai',
    'wbtc',
    'eurc',
    'cbbtc',
    'aave',
  ],

  // Prime
  [CustomMarket.proto_lido_v3]: ['usdc', 'usds', 'eth'],

  // Base
  [CustomMarket.proto_base_v3]: [
    'weth',
    'eth',
    'usdc',
    'usdbc',
    'cbbtc',
    'eurc',
    'aave',
  ],

  // Arbitrum
  [CustomMarket.proto_arbitrum_v3]: [
    'usdt',
    'usdc',
    'weth',
    'eth',
    'dai',
    'wbtc',
    'aave',
    'arb',
  ],

  // Avalanche
  [CustomMarket.proto_avalanche_v3]: [
    'weth',
    'usdc',
    'wavax',
    'avax',
    'btc.b',
    'usdt',
    'dai.e',
    'eurc',
    'aave',
    'eusde',
  ],

  // Linea
  [CustomMarket.proto_linea_v3]: ['weth', 'usdt', 'usdc', 'wbtc', 'eth'],

  // Sonic
  [CustomMarket.proto_sonic_v3]: ['usdc', 'weth', 's', 'ws'],

  // OP
  [CustomMarket.proto_optimism_v3]: [
    'weth',
    'eth',
    'usdc',
    'usdt',
    'op',
    'wbtc',
    'dai',
    'aave',
  ],

  // Horizon RWA
  [CustomMarket.proto_horizon_v3]: ['usdc'],

  // Plasma
  [CustomMarket.proto_plasma_v3]: ['usdt', 'usde', 'weth'],

  // Polygon
  [CustomMarket.proto_polygon_v3]: [
    'wpol',
    'pol',
    'usdt',
    'usdc',
    'weth',
    'dai',
    'wbtc',
    'aave',
  ],

  // Ink
  [CustomMarket.proto_ink_v3]: ['weth', 'eth', 'usdt', 'usdc', 'usdg'],

  // Gnosis
  [CustomMarket.proto_gnosis_v3]: ['wxdai', 'xdau', 'eure', 'usdc'],

  // BNB Chain
  [CustomMarket.proto_bnb_v3]: ['bnb', 'wbnb', 'usdt', 'usdc', 'eth', 'btcb'],

  // Scroll
  [CustomMarket.proto_scroll_v3]: ['weth', 'eth', 'usdc', 'scr'],

  // ZKsync
  [CustomMarket.proto_zksync_v3]: ['usdc', 'eth', 'zk', 'usdt'],

  // Celo
  [CustomMarket.proto_celo_v3]: ['celo', 'usdt', 'usdc', 'weth'],

  // Soneium
  [CustomMarket.proto_soneium_v3]: ['weth', 'eth', 'usdc', 'usdt'],

  // Metis
  [CustomMarket.proto_metis_v3]: ['metis', 'weth', 'm.usdt', 'm.usdc', 'm.dai'],
};

export const isUnFoldToken = (market: CustomMarket, symbol: string) => {
  if (!unfoldTokenSymbols[market]) {
    // 没找到就是新配置的market，默认展开
    return true;
  }
  return unfoldTokenSymbols[market]?.includes(symbol.toLowerCase()) ?? false;
};
