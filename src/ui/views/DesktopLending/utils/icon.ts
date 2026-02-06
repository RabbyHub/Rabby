import {
  AaveV3Arbitrum,
  AaveV3Ethereum,
  AaveV3Gnosis,
  AaveV3Optimism,
  AaveV3Plasma,
  AaveV3Polygon,
} from '@bgd-labs/aave-address-book';

export const unPrefixSymbol = (symbol: string, prefix: string) => {
  return symbol
    .toUpperCase()
    .replace(RegExp(`^(${prefix[0]}?${prefix.slice(1)})`), '');
};

export interface IconSymbolInterface {
  underlyingAsset: string;
  symbol: string;
  name?: string;
}

export interface IconMapInterface {
  iconSymbol: string;
  name?: string;
  symbol?: string;
}

/**
 * Maps onchain symbols to different symbols.
 * This is useful when you want to explode symbols via _ to render multiple symbols or when the symbol has a bridge prefix or suffix.
 */
export const SYMBOL_MAP: { [key: string]: string } = {
  BPTBALWETH: 'BPT_BAL_WETH',
  BPTWBTCWETH: 'BPT_WBTC_WETH',
  UNIAAVEWETH: 'UNI_AAVE_WETH',
  UNIBATWETH: 'UNI_BAT_WETH',
  UNICRVWETH: 'UNI_CRV_WETH',
  UNIDAIUSDC: 'UNI_DAI_USDC',
  UNIDAIWETH: 'UNI_DAI_WETH',
  UNILINKWETH: 'UNI_LINK_WETH',
  UNIMKRWETH: 'UNI_MKR_WETH',
  UNIRENWETH: 'UNI_REN_WETH',
  UNISNXWETH: 'UNI_SNX_WETH',
  UNIUNIWETH: 'UNI_UNI_WETH',
  UNIUSDCWETH: 'UNI_USDC_WETH',
  UNIWBTCUSDC: 'UNI_WBTC_USDC',
  UNIWBTCWETH: 'UNI_WBTC_WETH',
  UNIYFIWETH: 'UNI_YFI_WETH',
  fUSDT: 'USDT',
  // avalanche
  'DAI.e': 'DAI',
  'LINK.e': 'LINK',
  'WBTC.e': 'WBTC',
  'WETH.e': 'WETH',
  'AAVE.e': 'AAVE',
  'USDT.e': 'USDT',
  'USDC.e': 'USDC',
  'BTC.b': 'BTC',
  // polygon
  miMATIC: 'MAI',
  // metis
  'm.USDC': 'USDC',
  'm.USDT': 'USDT',
  'm.DAI': 'DAI',
  // celo
  'USD₮': 'USDT',
};

/**
 * Maps (potentially altered via SYMBOL_MAP) symbols to a name
 * With the next version of uipooldataprovider https://github.com/aave/aave-v3-periphery/pull/89 this list can be greatly reduced/removed.
 */
export const SYMBOL_NAME_MAP: { [key: string]: string } = {
  AVAX: 'Avalanche',
  ETH: 'Ethereum',
  EUROS: 'STASIS EURO',
  FAI: 'Fei USD',
  GHST: 'Aavegotchi GHST',
  GUSD: 'Gemini Dollar',
  LINK: 'ChainLink',
  MAI: 'MAI (mimatic)',
  MANA: 'Decentraland',
  MKR: 'Maker',
  PAX: 'Paxos Standard',
  RAI: 'Rai Reflex Index',
  REP: 'Augur',
  SAVAX: 'Benqi Staked Avalanche',
  STETH: 'Lido Staked Ether',
  STKAAVE: 'Stake Aave',
  TUSD: 'TrueUSD',
  UNI: 'Uniswap',
  UNIDAIWETH: 'UNI DAI/WETH',
  UNIWBTCUSDC: 'UNI WBTC/USDC',
  USDT: 'Tether',
  WAVAX: 'Wrapped Avalanche',
  WBTC: 'Wrapped BTC',
  WETH: 'Wrapped ETH',
  WFTM: 'Wrapped FTM',
  WPOL: 'Wrapped POL',
  WONE: 'Wrapped ONE',
  YFI: 'yearn.finance',
  ZRX: '0x Coin',
  '1INCH': '1inch Network',
  LUSD: 'LUSD Stablecoin',
  FBTC: 'FunctionBTC',
};

export function fetchIconSymbolAndName({
  underlyingAsset,
  symbol,
  name,
}: IconSymbolInterface) {
  const underlyingAssetMap: Record<string, IconMapInterface> = {
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': {
      name,
      symbol,
      iconSymbol: 'usdt0',
    },
    '0x18084fba666a33d37592fa2633fd49a74dd93a88': {
      name: 'tBTC',
      symbol: 'tBTC',
      iconSymbol: 'tBTC',
    },
    '0xdd974d5c2e2928dea5f71b9825b8b646686bd200': {
      name: 'Kyber Legacy',
      symbol: 'KNCL',
      iconSymbol: 'KNCL',
    },
    [AaveV3Arbitrum.ASSETS.USDC.UNDERLYING.toLowerCase()]: {
      name: 'Bridged USDC',
      symbol: 'USDC.e',
      iconSymbol: 'USDC',
    },
    [AaveV3Optimism.ASSETS.USDC.UNDERLYING.toLowerCase()]: {
      name: 'Bridged USDC',
      symbol: 'USDC.e',
      iconSymbol: 'USDC',
    },
    [AaveV3Polygon.ASSETS.USDC.UNDERLYING.toLowerCase()]: {
      name: 'Bridged USDC',
      symbol: 'USDC.e',
      iconSymbol: 'USDC',
    },
    [AaveV3Gnosis.ASSETS.sDAI.UNDERLYING.toLowerCase()]: {
      name: 'Savings xDAI',
      symbol: 'sDAI',
      iconSymbol: 'gnosissdai',
    },
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': {
      name: 'BTCB Token',
      symbol: 'BTCB',
      iconSymbol: 'btc',
    },
    [AaveV3Ethereum.ASSETS.PT_eUSDE_29MAY2025.UNDERLYING.toLowerCase()]: {
      symbol: 'PT eUSDe May',
      name: 'PT eUSDe May',
      iconSymbol: 'pteusde',
    },
    [AaveV3Ethereum.ASSETS.PT_sUSDE_31JUL2025.UNDERLYING.toLowerCase()]: {
      symbol: 'PT sUSDe July',
      name: 'PT sUSDe July',
      iconSymbol: 'ptsusde',
    },
    [AaveV3Ethereum.ASSETS.PT_sUSDE_25SEP2025.UNDERLYING.toLowerCase()]: {
      symbol: 'PT sUSDe September',
      name: 'PT sUSDe September',
      iconSymbol: 'ptsusde',
    },
    [AaveV3Ethereum.ASSETS.PT_sUSDE_27NOV2025.UNDERLYING.toLowerCase()]: {
      symbol: 'PT sUSDe November 27th 2025',
      name: 'PT sUSDe November 2025',
      iconSymbol: 'ptsusde',
    },
    '0x917459337caac939d41d7493b3999f571d20d667': {
      symbol: 'PT USDe July',
      name: 'PT USDe July',
      iconSymbol: 'ptusde',
    },
    '0x14bdc3a3ae09f5518b923b69489cbcafb238e617': {
      symbol: 'PT eUSDe August',
      name: 'PT eUSDe August',
      iconSymbol: 'pteusde',
    },
    '0xbc6736d346a5ebc0debc997397912cd9b8fae10a': {
      symbol: 'PT USDe September 25th 2025',
      name: 'PT USDe September 2025',
      iconSymbol: 'ptusde',
    },
    [AaveV3Ethereum.ASSETS.PT_USDe_27NOV2025.UNDERLYING.toLowerCase()]: {
      symbol: 'PT USDe November 27th 2025',
      name: 'PT USDe November 2025',
      iconSymbol: 'ptusde',
    },

    '0x6100E367285b01F48D07953803A2d8dCA5D19873': {
      //not yet in @bgd-labs/aave-address-book
      symbol: 'WXLP',
      name: 'Wrapped XLP',
      iconSymbol: 'wxlp',
    },

    [AaveV3Plasma.ASSETS.PT_USDe_15JAN2026.UNDERLYING.toLowerCase()]: {
      symbol: 'PT USDe January 15th 2026',
      name: 'PT USDe January 2026',
      iconSymbol: 'ptusde',
    },
    [AaveV3Plasma.ASSETS.PT_sUSDE_15JAN2026.UNDERLYING.toLowerCase()]: {
      symbol: 'PT sUSDe January 15th 2026',
      name: 'PT sUSDe January 2026',
      iconSymbol: 'ptsusde',
    },

    [AaveV3Plasma.ASSETS.syrupUSDT.UNDERLYING.toLowerCase()]: {
      symbol: 'syrupUSDT',
      name: 'syrupUSDT',
      iconSymbol: 'syrupusdt',
    },
    '0x1f84a51296691320478c98b8d77f2bbd17d34350': {
      symbol: 'PT USDe February 5th 2026',
      name: 'PT USDe February 2026',
      iconSymbol: 'ptusde',
    },
    '0xe8483517077afa11a9b07f849cee2552f040d7b2': {
      symbol: 'PT sUSDe February 5th 2026',
      name: 'PT sUSDe February 2026',
      iconSymbol: 'ptsusde',
    },

    '0xa693B19d2931d498c5B318dF961919BB4aee87a5': {
      iconSymbol: 'UST',
      name: 'UST (Wormhole)',
    },
    '0x59a19d8c652fa0284f44113d0ff9aba70bd46fb4': {
      iconSymbol: 'BPT_BAL_WETH',
    },
    '0x1eff8af5d577060ba4ac8a29a13525bb0ee2a3d5': {
      iconSymbol: 'BPT_WBTC_WETH',
    },
    '0xdfc14d2af169b0d36c4eff567ada9b2e0cae044f': {
      iconSymbol: 'UNI_AAVE_WETH',
    },
    '0xb6909b960dbbe7392d405429eb2b3649752b4838': {
      iconSymbol: 'UNI_BAT_WETH',
    },
    '0x3da1313ae46132a397d90d95b1424a9a7e3e0fce': {
      iconSymbol: 'UNI_CRV_WETH',
    },
    '0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5': {
      iconSymbol: 'UNI_DAI_USDC',
    },
    '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11': {
      iconSymbol: 'UNI_DAI_WETH',
    },
    '0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974': {
      iconSymbol: 'UNI_LINK_WETH',
    },
    '0xc2adda861f89bbb333c90c492cb837741916a225': {
      iconSymbol: 'UNI_MKR_WETH',
    },
    '0x8bd1661da98ebdd3bd080f0be4e6d9be8ce9858c': {
      iconSymbol: 'UNI_REN_WETH',
    },
    '0x43ae24960e5534731fc831386c07755a2dc33d47': {
      iconSymbol: 'UNI_SNX_WETH',
    },
    '0xd3d2e2692501a5c9ca623199d38826e513033a17': {
      iconSymbol: 'UNI_UNI_WETH',
    },
    '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc': {
      iconSymbol: 'UNI_USDC_WETH',
    },
    '0x004375dff511095cc5a197a54140a24efef3a416': {
      iconSymbol: 'UNI_BTC_USDC',
    },
    '0xbb2b8038a1640196fbe3e38816f3e67cba72d940': {
      iconSymbol: 'UNI_WBTC_WETH',
    },
    '0x2fdbadf3c4d5a8666bc06645b8358ab803996e28': {
      iconSymbol: 'UNI_YFI_WETH',
    },
  };

  const lowerUnderlyingAsset = underlyingAsset.toLowerCase();
  if (lowerUnderlyingAsset in underlyingAssetMap) {
    return {
      symbol,
      ...underlyingAssetMap[lowerUnderlyingAsset],
    };
  }

  const unifiedSymbol = unPrefixSymbol(
    (SYMBOL_MAP[symbol] || symbol).toUpperCase(),
    'AMM'
  );
  return {
    iconSymbol: unifiedSymbol,
    name: SYMBOL_NAME_MAP[unifiedSymbol.toUpperCase()] || name || unifiedSymbol,
    symbol,
  };
}
