import { PerpTopTokenV3, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import DEFAULT_TOP_ASSET_JSON from './constants/PerpsTopAsset.json';

// must be a USDC token and more than 5 usdc
export const PERPS_SEND_ARB_USDC_ADDRESS =
  '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7';

export const PERPS_AGENT_NAME = 'rabby-agent';

export const ARB_USDC_TOKEN_ID = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

export const ARB_USDC_TOKEN_SERVER_CHAIN = 'arb';

export const ARB_USDC_TOKEN_ITEM = {
  id: ARB_USDC_TOKEN_ID,
  chain: ARB_USDC_TOKEN_SERVER_CHAIN,
  name: 'USD Coin',
  optimized_symbol: 'USDC',
  symbol: 'USDC',
  logo_url:
    'https://static.debank.com/image/arb_token/logo_url/0xaf88d065e77c8cc2239327c5edb3a432268e5831/fffcd27b9efff5a86ab942084c05924d.png',
  amount: 0,
  price: 1,
  decimals: 6,
  display_symbol: 'USDC',
  is_core: false,
  is_verified: false,
  is_wallet: false,
  is_scam: false,
  is_infinity: false,
  is_suspicious: false,
  time_at: 0,
} as TokenItem;
export const HYPE_USDC_TOKEN_ID = '0xb88339cb7199b77e23db6e890353e22632ba630f';

export const HYPE_USDC_TOKEN_SERVER_CHAIN = 'hyper';

export const HYPE_CORE_DEPOSIT_WALLET =
  '0x6b9e773128f453f5c2c60935ee2de2cbc5390a24';

export const HYPE_CORE_DEPOSIT_PERPS_DEX = 0;

export const HYPE_EVM_BRIDGE_ADDRESS =
  '0x2000000000000000000000000000000000000000';
export const HYPE_EVM_BRIDGE_ADDRESS_MAP = {
  USDC: HYPE_EVM_BRIDGE_ADDRESS,
  USDT: '0x200000000000000000000000000000000000010c',
  USDE: '0x20000000000000000000000000000000000000eb',
  USDH: '0x2000000000000000000000000000000000000168',
};
export const HYPE_SEND_ASSET_TOKEN = 'USDC';
export const HYPE_SEND_ASSET_TOKEN_MAP = {
  USDC: 'USDC',
  USDT: 'USDT0:0x25faedc3f054130dbb4e4203aca63567',
  USDE: 'USDE:0x2e6d84f2d7ca82e6581e03523e4389f7',
  USDH: 'USDH:0x54e00a5988577cb0b0c9ab0cb6ef7f4b',
};
export const HYPE_GAS_FEE_IN_HYPE = 0.00002;

export const HYPE_USDC_TOKEN_ITEM = {
  id: HYPE_USDC_TOKEN_ID,
  chain: HYPE_USDC_TOKEN_SERVER_CHAIN,
  name: 'USD Coin',
  optimized_symbol: 'USDC',
  symbol: 'USDC',
  logo_url:
    'https://static.debank.com/image/arb_token/logo_url/0xaf88d065e77c8cc2239327c5edb3a432268e5831/fffcd27b9efff5a86ab942084c05924d.png',
  amount: 0,
  price: 1,
  decimals: 6,
  display_symbol: 'USDC',
  is_core: false,
  is_verified: false,
  is_wallet: false,
  is_scam: false,
  is_infinity: false,
  is_suspicious: false,
  time_at: 0,
} as TokenItem;

export const HYPE_USDT_TOKEN_ITEM = {
  ...HYPE_USDC_TOKEN_ITEM,
  id: 'hype-usdt',
  name: 'Tether USD',
  optimized_symbol: 'USDT',
  symbol: 'USDT',
  display_symbol: 'USDT',
  logo_url:
    'https://static.debank.com/image/ink_token/logo_url/0x0200c29006150606b650577bbe7b6248f58470c1/8bba37fddc2774e06a94b8952e3e3ad7.png',
} as TokenItem;

export const HYPE_USDE_TOKEN_ITEM = {
  ...HYPE_USDC_TOKEN_ITEM,
  id: 'hype-usde',
  name: 'USDe',
  optimized_symbol: 'USDE',
  symbol: 'USDE',
  display_symbol: 'USDE',
  logo_url:
    'https://static.debank.com/image/hyper_token/logo_url/0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34/2b2f84856552421d8305bbc71db49979.png',
} as TokenItem;

export const HYPE_USDH_TOKEN_ITEM = {
  ...HYPE_USDC_TOKEN_ITEM,
  id: 'hype-usdh',
  name: 'USDH',
  optimized_symbol: 'USDH',
  symbol: 'USDH',
  display_symbol: 'USDH',
  logo_url:
    'https://static.debank.com/image/hyper_token/logo_url/0x111111a1a0667d36bd57c0a9f569b98057111111/45fe2106ae3488029ae9fbf922f1678a.png',
} as TokenItem;

export const WITHDRAW_TOKEN_LIST: TokenItem[] = [
  ARB_USDC_TOKEN_ITEM,
  HYPE_USDC_TOKEN_ITEM,
];

// Tokens grouped by chain for withdraw chain/token selection
export const WITHDRAW_CHAIN_TOKENS: Record<string, TokenItem[]> = {
  [ARB_USDC_TOKEN_SERVER_CHAIN]: [ARB_USDC_TOKEN_ITEM],
  [HYPE_USDC_TOKEN_SERVER_CHAIN]: [
    HYPE_USDC_TOKEN_ITEM,
    HYPE_USDT_TOKEN_ITEM,
    HYPE_USDE_TOKEN_ITEM,
    HYPE_USDH_TOKEN_ITEM,
  ],
};

export const WITHDRAW_CHAINS = [
  { chainEnum: 'ARBITRUM' as const, serverChain: ARB_USDC_TOKEN_SERVER_CHAIN },
  { chainEnum: 'HYPER' as const, serverChain: HYPE_USDC_TOKEN_SERVER_CHAIN },
];

export function isDirectDepositToken(token: TokenItem): boolean {
  return (
    (token.id === ARB_USDC_TOKEN_ID &&
      token.chain === ARB_USDC_TOKEN_SERVER_CHAIN) ||
    (token.id === HYPE_USDC_TOKEN_ID &&
      token.chain === HYPE_USDC_TOKEN_SERVER_CHAIN)
  );
}

export function isHypeWithdrawToken(token?: TokenItem | null): boolean {
  return (
    token?.id === HYPE_USDC_TOKEN_ID &&
    token?.chain === HYPE_USDC_TOKEN_SERVER_CHAIN
  );
}

export enum CANDLE_MENU_KEY {
  ONE_HOUR = '1H',
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  YTD = 'YTD',
  ALL = 'ALL',
}

export enum CANDLE_MENU_KEY_V2 {
  FIVE_MINUTES = '5M',
  FIFTEEN_MINUTES = '15M',
  ONE_HOUR = '1H',
  FOUR_HOURS = '4H',
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
}

export enum CandlePeriod {
  ONE_MINUTE = '1m',
  THREE_MINUTES = '3m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  TWO_HOURS = '2h',
  FOUR_HOURS = '4h',
  EIGHT_HOURS = '8h',
  TWELVE_HOURS = '12h',
  ONE_DAY = '1d',
  THREE_DAYS = '3d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M',
}

export const DEFAULT_TOP_ASSET = DEFAULT_TOP_ASSET_JSON as PerpTopTokenV3[];

const INIT_PERPS_BUILD_FEE_RECEIVE_ADDRESS =
  '0xAd9bE64fD7a35d99a138b87CB212BAefbCDCf045';
export const PERPS_BUILD_FEE_RECEIVE_ADDRESS = INIT_PERPS_BUILD_FEE_RECEIVE_ADDRESS.toLowerCase();

export const PERPS_EXCHANGE_FEE_NUMBER = 0.0002;

export const PERPS_BUILD_FEE = 20; // '0.02%'

const PERPS_BUILD_FEE_PRO = 20;

export const PERPS_BUILDER_INFO = {
  address: PERPS_BUILD_FEE_RECEIVE_ADDRESS,
  fee: PERPS_BUILD_FEE,
};

export const PERPS_BUILDER_INFO_PRO = {
  address: PERPS_BUILD_FEE_RECEIVE_ADDRESS,
  fee: PERPS_BUILD_FEE_PRO,
};

export const PERPS_MAX_NTL_VALUE = 1000000;

export const PERPS_REFERENCE_CODE = 'RABBYWALLET';

export const DELETE_AGENT_EMPTY_ADDRESS =
  '0x0000000000000000000000000000000000000000';

export enum PERPS_POSITION_RISK_LEVEL {
  SAFE = 'safe',
  WARNING = 'warning',
  DANGER = 'danger',
}

export const PERPS_MARGIN_SIGNIFICANT_DIGITS = 6;

export const PERPS_MINI_USD_VALUE = 10; // $10

export const PERPS_INVITE_URL = `https://app.hyperliquid.xyz/join/${PERPS_REFERENCE_CODE}`;

// =============== Multi-stablecoin / HIP-3 ===============

export type PerpsQuoteAsset = 'USDC' | 'USDT' | 'USDH' | 'USDE';

export const ALL_PERPS_QUOTE_ASSETS: PerpsQuoteAsset[] = [
  'USDC',
  'USDT',
  'USDH',
  'USDE',
];

export const COLLATERAL_TOKEN_TO_QUOTE: Record<number, PerpsQuoteAsset> = {
  0: 'USDC',
  268: 'USDT',
  235: 'USDE',
  360: 'USDH',
};

export const STABLE_COIN_INDEX_ID_MAP: Record<PerpsQuoteAsset, number> = {
  USDC: 0,
  USDE: 150,
  USDT: 166,
  USDH: 230,
};

// Non-USDC quote assets that need stablecoin swap before trading
export const SWAP_REQUIRED_QUOTE_ASSETS: PerpsQuoteAsset[] = [
  'USDT',
  'USDH',
  'USDE',
];

// Hyperliquid spot balance keys: USDT is keyed as 'USDT0' on the spot side.
export const getSpotBalanceKey = (asset: PerpsQuoteAsset): string =>
  asset === 'USDT' ? 'USDT0' : asset;

export const PERPS_LOW_BALANCE_THRESHOLD = 0.1;

// Spot market coin IDs for stablecoin-vs-USDC pairs
export const SPOT_STABLE_COIN_NAME: Record<
  Exclude<PerpsQuoteAsset, 'USDC'>,
  string
> = {
  USDE: '@150',
  USDT: '@166',
  USDH: '@230',
};
