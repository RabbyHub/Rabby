import { PerpTopToken, TokenItem } from '@rabby-wallet/rabby-api/dist/types';

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

export const DEFAULT_TOP_ASSET = [
  {
    id: 0,
    name: 'BTC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BTC/da8784002998f4dbca0ad720ad10812f.png',
    daily_volume: 5219077751,
    dex_id: '',
  },
  {
    id: 1,
    name: 'ETH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETH/080c551d4527c48c664e2f9a42358c05.png',
    daily_volume: 2988027289,
    dex_id: '',
  },
  {
    id: 26,
    name: 'xyz:SILVER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:SILVER/cbda9e8eb7e137bb8134ef4ba261c8f7.png',
    daily_volume: 1186846552,
    dex_id: 'xyz',
  },
  {
    id: 159,
    name: 'HYPE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HYPE/3640171ae0c3b46e6a465d278cf02d79.png',
    daily_volume: 1074678468,
    dex_id: '',
  },
  {
    id: 5,
    name: 'SOL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SOL/cf9836949424eb6c85cb04f386526134.png',
    daily_volume: 597442599,
    dex_id: '',
  },
  {
    id: 3,
    name: 'xyz:GOLD',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:GOLD/41e2d55f4cb67f048af9100d9bb46a0b.png',
    daily_volume: 421469663,
    dex_id: 'xyz',
  },
  {
    id: 0,
    name: 'xyz:XYZ100',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:XYZ100/136c4d5fe2bffe8a3216ccae24e86881.png',
    daily_volume: 295637194,
    dex_id: 'xyz',
  },
  {
    id: 25,
    name: 'XRP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XRP/b0abed5f6d58330a233bc7c244a6dd5d.png',
    daily_volume: 178243163,
    dex_id: '',
  },
  {
    id: 30,
    name: 'xyz:COPPER',
    full_logo_url: null,
    daily_volume: 107104538,
    dex_id: 'xyz',
  },
  {
    id: 200,
    name: 'PUMP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PUMP/17f68604935e1bea98a906c5807d1ce8.png',
    daily_volume: 66471280,
    dex_id: '',
  },
  {
    id: 214,
    name: 'ZEC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZEC/94524c82f79bb7e037dee53efe5b1e92.png',
    daily_volume: 52194133,
    dex_id: '',
  },
  {
    id: 12,
    name: 'DOGE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOGE/afd891241598726761558a25aab6a06e.png',
    daily_volume: 48348036,
    dex_id: '',
  },
  {
    id: 187,
    name: 'PAXG',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PAXG/64142af26aa980f965ecfda67bc32b83.png',
    daily_volume: 41482765,
    dex_id: '',
  },
  {
    id: 14,
    name: 'SUI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SUI/216ac14f33c8e145cc85b8441a99a9e4.png',
    daily_volume: 35421710,
    dex_id: '',
  },
  {
    id: 223,
    name: 'LIT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LIT/01c3f6a6c75b88412062e14c31ef5820.png',
    daily_volume: 26619136,
    dex_id: '',
  },
  {
    id: 165,
    name: 'FARTCOIN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FARTCOIN/7570a0003534d307ea94dc469df4774f.png',
    daily_volume: 24643613,
    dex_id: '',
  },
  {
    id: 6,
    name: 'xyz:PLTR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:PLTR/1557952737ea84fef5a5067d752b98c6.png',
    daily_volume: 23506260,
    dex_id: 'xyz',
  },
  {
    id: 1,
    name: 'xyz:TSLA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:TSLA/ddded05e9bc380648cc791ccac25943d.png',
    daily_volume: 22600204,
    dex_id: 'xyz',
  },
  {
    id: 15,
    name: 'kPEPE',
    full_logo_url: null,
    daily_volume: 21181624,
    dex_id: '',
  },
  {
    id: 17,
    name: 'xyz:MSTR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:MSTR/2bb5b9f575d2ee817cd3ccfcd4c1db86.png',
    daily_volume: 19977412,
    dex_id: 'xyz',
  },
  {
    id: 2,
    name: 'xyz:NVDA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:NVDA/009dab5c0fd1dc0e1769e7dd6a3671ee.png',
    daily_volume: 16695597,
    dex_id: 'xyz',
  },
  {
    id: 16,
    name: 'xyz:SNDK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:SNDK/0b237cefdfa997208756fbe53bc22dcd.png',
    daily_volume: 16362764,
    dex_id: 'xyz',
  },
  {
    id: 35,
    name: 'xyz:PLATINUM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:PLATINUM/ccb1da74a422e5df4d696889a3510157.png',
    daily_volume: 16037229,
    dex_id: 'xyz',
  },
  {
    id: 207,
    name: 'ASTER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ASTER/fa1b9e97d9eb35b48c8e2b000e2646f7.png',
    daily_volume: 15357808,
    dex_id: '',
  },
  {
    id: 29,
    name: 'xyz:CL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:CL/caf7175de18afb5fb418095b8d9f0753.png',
    daily_volume: 14938819,
    dex_id: 'xyz',
  },
  {
    id: 4,
    name: 'xyz:HOOD',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:HOOD/0eb856c1cde90aa31c27708be31f5e5c.png',
    daily_volume: 14820780,
    dex_id: 'xyz',
  },
  {
    id: 203,
    name: 'XPL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XPL/af3e79fa6d415538fdcfe346a5e5de8f.png',
    daily_volume: 14557506,
    dex_id: '',
  },
  {
    id: 7,
    name: 'BNB',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BNB/c2cd1be5eec797728b6abb756f73f735.png',
    daily_volume: 14314229,
    dex_id: '',
  },
  {
    id: 18,
    name: 'LINK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LINK/d4d3c2c5dbd014a03e36442e2c31a9a2.png',
    daily_volume: 13367418,
    dex_id: '',
  },
  {
    id: 31,
    name: 'xyz:NATGAS',
    full_logo_url: null,
    daily_volume: 12592096,
    dex_id: 'xyz',
  },
  {
    id: 5,
    name: 'xyz:INTC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:INTC/23f9ee66cadb8c1d0bf95bfc699dde49.png',
    daily_volume: 11995307,
    dex_id: 'xyz',
  },
  {
    id: 224,
    name: 'XMR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XMR/f8cfd159ff01029680cc9d8d8f1e2814.png',
    daily_volume: 11968788,
    dex_id: '',
  },
  {
    id: 6,
    name: 'AVAX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AVAX/683a3e4ed6e4cc3f60990e41335109ba.png',
    daily_volume: 11882465,
    dex_id: '',
  },
  {
    id: 12,
    name: 'xyz:GOOGL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:GOOGL/90bd275a68f398aa06f234c7945de915.png',
    daily_volume: 11287712,
    dex_id: 'xyz',
  },
  {
    id: 46,
    name: 'ZRO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZRO/39fb78b21efbf2d25ada336a018ba400.png',
    daily_volume: 10474407,
    dex_id: '',
  },
  {
    id: 14,
    name: 'xyz:AMD',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:AMD/900474419ee2a179a0f87ecb871b513a.png',
    daily_volume: 10385616,
    dex_id: 'xyz',
  },
  {
    id: 122,
    name: 'ENA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ENA/1d3a2258ecb310f52a33a87810c72a13.png',
    daily_volume: 10357615,
    dex_id: '',
  },
  {
    id: 28,
    name: 'AAVE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AAVE/5c49848c770ed1f4f468a3b40bcbcdcb.png',
    daily_volume: 9885990,
    dex_id: '',
  },
  {
    id: 15,
    name: 'xyz:MU',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:MU/b2a3903742272b1afe4ba50ff69bf56a.png',
    daily_volume: 9691472,
    dex_id: 'xyz',
  },
  {
    id: 65,
    name: 'ADA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ADA/7cbadf4be8f16bbc12fadda88878d526.png',
    daily_volume: 9500073,
    dex_id: '',
  },
  {
    id: 7,
    name: 'xyz:COIN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:COIN/99a18e4fd1a3ee16ad8de26dccc34d67.png',
    daily_volume: 8510739,
    dex_id: 'xyz',
  },
  {
    id: 204,
    name: 'WLFI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WLFI/1da8bf3d3a96368ccce6dba5a7ab0998.png',
    daily_volume: 8393005,
    dex_id: '',
  },
  {
    id: 116,
    name: 'TAO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TAO/62eb5674c16ffc83e937cdf10f35faf8.png',
    daily_volume: 8247371,
    dex_id: '',
  },
  {
    id: 10,
    name: 'LTC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LTC/b55f550716370862025a732a2cb2fa24.png',
    daily_volume: 7102671,
    dex_id: '',
  },
  {
    id: 31,
    name: 'WLD',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WLD/48811bfd61e58790bef369de9aadb205.png',
    daily_volume: 6537947,
    dex_id: '',
  },
  {
    id: 215,
    name: 'MON',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MON/9507fec62b55352e23aa2ce58ce87b57.png',
    daily_volume: 5938516,
    dex_id: '',
  },
  {
    id: 162,
    name: 'VIRTUAL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VIRTUAL/c398edbae38e29eed19359dacde6fe60.png',
    daily_volume: 5789488,
    dex_id: '',
  },
  {
    id: 174,
    name: 'TRUMP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRUMP/a17d412d5e7f39327f31177f030c0afc.png',
    daily_volume: 5299150,
    dex_id: '',
  },
  {
    id: 16,
    name: 'CRV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CRV/651c340dcab38fbb48e9fbf3765d885a.png',
    daily_volume: 4937136,
    dex_id: '',
  },
  {
    id: 19,
    name: 'STX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/STX/79c0d5e0b29c8f54f983712c606ab9ab.png',
    daily_volume: 4928511,
    dex_id: '',
  },
  {
    id: 13,
    name: 'xyz:AMZN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:AMZN/0676335ac18d82faa439da0a73629a5f.png',
    daily_volume: 4913246,
    dex_id: 'xyz',
  },
  {
    id: 26,
    name: 'BCH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BCH/58d69f12294597ffd78a1558fa8a1764.png',
    daily_volume: 4775703,
    dex_id: '',
  },
  {
    id: 98,
    name: 'WIF',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WIF/84bbc41011231fb0cd53f27fed09363c.png',
    daily_volume: 4764553,
    dex_id: '',
  },
  {
    id: 85,
    name: 'kBONK',
    full_logo_url: null,
    daily_volume: 4682598,
    dex_id: '',
  },
  {
    id: 142,
    name: 'POL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POL/8b2f0684d578a2a35edb02f96cc1625d.png',
    daily_volume: 4159649,
    dex_id: '',
  },
  {
    id: 218,
    name: 'CC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CC/2736a0294f1f4ba3c5efb06044f68db0.png',
    daily_volume: 4096804,
    dex_id: '',
  },
  {
    id: 18,
    name: 'xyz:CRCL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:CRCL/4e43c780b72267c8d58c1c016fbbcd6d.png',
    daily_volume: 4035117,
    dex_id: 'xyz',
  },
  {
    id: 11,
    name: 'ARB',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ARB/c333b72aaf0782c039357de0131e7b4c.png',
    daily_volume: 4025099,
    dex_id: '',
  },
  {
    id: 90,
    name: 'JUP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/JUP/a689b0796bd802d4f8ba7c17c1e11474.png',
    daily_volume: 3918655,
    dex_id: '',
  },
  {
    id: 8,
    name: 'xyz:META',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:META/6626fad88e3c710046728bc4d3739239.png',
    daily_volume: 3802798,
    dex_id: 'xyz',
  },
  {
    id: 39,
    name: 'UNI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/UNI/1c2eaa04051996f2d9b310cc3a92bb36.png',
    daily_volume: 3715395,
    dex_id: '',
  },
  {
    id: 9,
    name: 'xyz:AAPL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:AAPL/4e68eab69afc3b547649bf6270e23fe0.png',
    daily_volume: 3707875,
    dex_id: 'xyz',
  },
  {
    id: 152,
    name: 'PURR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PURR/26a90cc916ea70d7bb13ac5715db9ff0.png',
    daily_volume: 3608523,
    dex_id: '',
  },
  {
    id: 171,
    name: 'SPX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SPX/763fc4fdb016443b2fee8a30f1534cb3.png',
    daily_volume: 3473162,
    dex_id: '',
  },
  {
    id: 163,
    name: 'PENGU',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PENGU/7de952f2680865214557bb2df7494cb5.png',
    daily_volume: 3423898,
    dex_id: '',
  },
  {
    id: 106,
    name: 'ONDO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ONDO/00b266668efa26d1b53b4d70b6bca73c.png',
    daily_volume: 3403676,
    dex_id: '',
  },
  {
    id: 225,
    name: 'AXS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AXS/fcce3ef3cd3f46092adb5ae63b417bd9.png',
    daily_volume: 3398219,
    dex_id: '',
  },
  {
    id: 25,
    name: 'xyz:EUR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:EUR/012bea767cce37ddcc16ff49665c2c60.png',
    daily_volume: 3388424,
    dex_id: 'xyz',
  },
  {
    id: 128,
    name: 'POPCAT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POPCAT/df6f2cd5a70f264a754da9fa223d1e5a.png',
    daily_volume: 3385435,
    dex_id: '',
  },
  {
    id: 11,
    name: 'xyz:ORCL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:ORCL/0881c782478ab0a33aa02dc5e7dc4c49.png',
    daily_volume: 3383576,
    dex_id: 'xyz',
  },
  {
    id: 180,
    name: 'BERA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BERA/75048c96c982027fa5dd4133d21b1185.png',
    daily_volume: 3017727,
    dex_id: '',
  },
  {
    id: 74,
    name: 'NEAR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEAR/2395f489cec165cfa7011fcce8407795.png',
    daily_volume: 2897205,
    dex_id: '',
  },
  {
    id: 24,
    name: 'xyz:JPY',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:JPY/99877b511455c0084fd6ea6624f10626.png',
    daily_volume: 2837426,
    dex_id: 'xyz',
  },
  {
    id: 221,
    name: 'STABLE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/STABLE/1c51600a4b48329b62b8e3efa3b90be1.png',
    daily_volume: 2737373,
    dex_id: '',
  },
  {
    id: 183,
    name: 'IP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IP/672d11093fff9898fb7ed16484e55063.png',
    daily_volume: 2700879,
    dex_id: '',
  },
  {
    id: 154,
    name: 'XLM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XLM/6cb8cdb7b1207fd3922f3010d4fd8108.png',
    daily_volume: 2676396,
    dex_id: '',
  },
  {
    id: 9,
    name: 'OP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/OP/2d6e16c2385b808687bcdc1b64804f5d.png',
    daily_volume: 2612259,
    dex_id: '',
  },
  {
    id: 10,
    name: 'xyz:MSFT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:MSFT/90b59741d2ea8de3f25160b6a7b1a917.png',
    daily_volume: 2575091,
    dex_id: 'xyz',
  },
  {
    id: 66,
    name: 'TON',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TON/c9ee9c517023051e14511f481f75cf71.png',
    daily_volume: 2563218,
    dex_id: '',
  },
  {
    id: 198,
    name: 'RESOLV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RESOLV/c1fede25c213fde9b50ff208cd6de87a.png',
    daily_volume: 2331701,
    dex_id: '',
  },
  {
    id: 17,
    name: 'LDO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LDO/e5344673ee5a332b1565aec36233d4a9.png',
    daily_volume: 2295855,
    dex_id: '',
  },
  {
    id: 28,
    name: 'xyz:BABA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:BABA/b46ee4a5341aae457ca4236bed57be3a.png',
    daily_volume: 2188414,
    dex_id: 'xyz',
  },
  {
    id: 40,
    name: 'SEI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SEI/fd316145e4219f0c0198b1dd08a126cb.png',
    daily_volume: 2108095,
    dex_id: '',
  },
  {
    id: 126,
    name: 'MERL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MERL/e40f0bec6215ee9ea7a4ab58a2254611.png',
    daily_volume: 2025453,
    dex_id: '',
  },
  {
    id: 70,
    name: 'PENDLE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PENDLE/3fa9622e5b784bab20d346c3fff90c04.png',
    daily_volume: 1972270,
    dex_id: '',
  },
  {
    id: 48,
    name: 'DOT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOT/55195146091a42246c8e250e7770481b.png',
    daily_volume: 1870171,
    dex_id: '',
  },
  {
    id: 136,
    name: 'ZK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZK/4e1141b54d8b4305184a88777c5d86f8.png',
    daily_volume: 1820868,
    dex_id: '',
  },
  {
    id: 27,
    name: 'APT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/APT/a6cf3aee5c9957228b54526f3463ef9e.png',
    daily_volume: 1732145,
    dex_id: '',
  },
  {
    id: 37,
    name: 'TRX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRX/077b94435d4413f247e1ade85ce9b6e1.png',
    daily_volume: 1632842,
    dex_id: '',
  },
  {
    id: 63,
    name: 'TIA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TIA/fd707748b08e443e062501f1c421525a.png',
    daily_volume: 1629423,
    dex_id: '',
  },
  {
    id: 19,
    name: 'xyz:NFLX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:NFLX/719de77cd87e78342fd835e43771bd24.png',
    daily_volume: 1535336,
    dex_id: 'xyz',
  },
  {
    id: 38,
    name: 'kSHIB',
    full_logo_url: null,
    daily_volume: 1465325,
    dex_id: '',
  },
  {
    id: 227,
    name: 'SKR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SKR/4ddb172951cdae5982b2fe9110d80e26.png',
    daily_volume: 1463692,
    dex_id: '',
  },
  {
    id: 208,
    name: 'AVNT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AVNT/88ef921c390f0ab0a99c55b628dc31f5.png',
    daily_volume: 1438664,
    dex_id: '',
  },
  {
    id: 219,
    name: 'ICP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ICP/9e375ae13afbbb30644e0dbc385f0644.png',
    daily_volume: 1281939,
    dex_id: '',
  },
  {
    id: 192,
    name: 'ZORA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZORA/27f4d1b58aef0ebe16f56afe5ea81ef1.png',
    daily_volume: 1206427,
    dex_id: '',
  },
  {
    id: 185,
    name: 'KAITO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/KAITO/bcea2bf670392ef8f802ce3057badb74.png',
    daily_volume: 1201703,
    dex_id: '',
  },
  {
    id: 173,
    name: 'MORPHO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MORPHO/a1c2039a8f2a9853a32c763edec18db5.png',
    daily_volume: 1187250,
    dex_id: '',
  },
  {
    id: 8,
    name: 'APE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/APE/5efc0fbcdeed3870048574cf1f15bc87.png',
    daily_volume: 1110870,
    dex_id: '',
  },
  {
    id: 113,
    name: 'STRK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/STRK/911a4d630daec8141c16619130a64fd6.png',
    daily_volume: 1084956,
    dex_id: '',
  },
  {
    id: 123,
    name: 'MNT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MNT/7ba0877eeb7deeacd8ab716b17fe0d68.png',
    daily_volume: 1061237,
    dex_id: '',
  },
  {
    id: 161,
    name: 'MOVE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MOVE/6572c3e598b6df190cf2a7c6d4e590be.png',
    daily_volume: 1009125,
    dex_id: '',
  },
  {
    id: 2,
    name: 'ATOM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ATOM/2ce8e895c8ee9c5146ff7bc6c8fb82d5.png',
    daily_volume: 953683,
    dex_id: '',
  },
  {
    id: 178,
    name: 'VVV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VVV/fc0c97e9f3a339b50e8726df20c12eb0.png',
    daily_volume: 916747,
    dex_id: '',
  },
  {
    id: 153,
    name: 'PNUT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PNUT/06e0eed45b89ba7f004c947045630990.png',
    daily_volume: 912477,
    dex_id: '',
  },
  {
    id: 199,
    name: 'SYRUP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SYRUP/17c6387b60fe74663896f093ef3271f8.png',
    daily_volume: 905738,
    dex_id: '',
  },
  {
    id: 127,
    name: 'HBAR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HBAR/652de1ec78938668e4b684b8999dc765.png',
    daily_volume: 874150,
    dex_id: '',
  },
  {
    id: 84,
    name: 'IMX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IMX/8e3ad2e6d16a47d5e83132c12dee705f.png',
    daily_volume: 865747,
    dex_id: '',
  },
  {
    id: 79,
    name: 'ZEN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZEN/0aab84ef8c2b19d0b853b380fa38e5ea.png',
    daily_volume: 862573,
    dex_id: '',
  },
  {
    id: 80,
    name: 'FIL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FIL/4b76933c8bd5910e1808d44520643c5f.png',
    daily_volume: 860204,
    dex_id: '',
  },
  {
    id: 121,
    name: 'ETHFI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETHFI/7bd4fb9d6be05e869a6ffb0f1f5422d4.png',
    daily_volume: 852227,
    dex_id: '',
  },
  {
    id: 226,
    name: 'DASH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DASH/82f40ae71ac00b954f95a8221867958e.png',
    daily_volume: 844789,
    dex_id: '',
  },
  {
    id: 217,
    name: 'MEGA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MEGA/2bd1f44234e9f24f1edafddaeaaf0112.png',
    daily_volume: 840821,
    dex_id: '',
  },
  {
    id: 94,
    name: 'JTO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/JTO/a9fcb76426a701f63e52cd2bcb04402d.png',
    daily_volume: 823404,
    dex_id: '',
  },
  {
    id: 23,
    name: 'xyz:TSM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:TSM/9f0f933fa8e7e3963a6b0d44c1e077ca.png',
    daily_volume: 811736,
    dex_id: 'xyz',
  },
  {
    id: 216,
    name: 'MET',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MET/285aa4f79d811d67ff41d86ecd79666f.png',
    daily_volume: 809932,
    dex_id: '',
  },
  {
    id: 119,
    name: 'kFLOKI',
    full_logo_url: null,
    daily_volume: 790517,
    dex_id: '',
  },
  {
    id: 206,
    name: 'SKY',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SKY/4acd38d8f11aae047538c456d4b7bf01.png',
    daily_volume: 777594,
    dex_id: '',
  },
  {
    id: 222,
    name: 'FOGO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FOGO/57d8088313d32b16e17dcdbaa468abd6.png',
    daily_volume: 749535,
    dex_id: '',
  },
  {
    id: 36,
    name: 'xyz:USAR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:USAR/6c52f38dfb183f0a957a96f1cbc42d48.png',
    daily_volume: 738138,
    dex_id: 'xyz',
  },
  {
    id: 156,
    name: 'SAND',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SAND/5a3cd60ee849f10bab8f8f1521e8471d.png',
    daily_volume: 729391,
    dex_id: '',
  },
  {
    id: 151,
    name: 'GRASS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GRASS/4d47ada2bb38659e40fc5b4604796df7.png',
    daily_volume: 701331,
    dex_id: '',
  },
  {
    id: 72,
    name: 'FET',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FET/5b2cbcaf4c4b67ddde2a040ab368e78b.png',
    daily_volume: 694847,
    dex_id: '',
  },
  {
    id: 130,
    name: 'EIGEN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/EIGEN/78449fb4de33c698c7eee344cc04d618.png',
    daily_volume: 685597,
    dex_id: '',
  },
  {
    id: 220,
    name: 'AERO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AERO/6cabd5f800c06031fafa61e7992be65c.png',
    daily_volume: 674983,
    dex_id: '',
  },
  {
    id: 150,
    name: 'MOODENG',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MOODENG/eea919702ea1af180b5c0b7f7dc69694.png',
    daily_volume: 645089,
    dex_id: '',
  },
  {
    id: 27,
    name: 'xyz:RIVN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:RIVN/1dcfb7e27bbdc1fb9b0a34646e995046.png',
    daily_volume: 614661,
    dex_id: 'xyz',
  },
  {
    id: 37,
    name: 'xyz:CRWV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/xyz:CRWV/07fba93a7123c1b8ff434ea14967d688.png',
    daily_volume: 603471,
    dex_id: 'xyz',
  },
  {
    id: 212,
    name: 'APEX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/APEX/18e8e9400cfadbd760016369134386c3.png',
    daily_volume: 579885,
    dex_id: '',
  },
  {
    id: 13,
    name: 'INJ',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/INJ/bea8af19e822e05a6749004acc822386.png',
    daily_volume: 560033,
    dex_id: '',
  },
  {
    id: 125,
    name: 'SAGA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SAGA/52aea33aa07844c36b0802b79a3760e0.png',
    daily_volume: 546100,
    dex_id: '',
  },
  {
    id: 38,
    name: 'xyz:URNM',
    full_logo_url: null,
    daily_volume: 545532,
    dex_id: 'xyz',
  },
  {
    id: 81,
    name: 'PYTH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PYTH/5aef5029c2364128c44b33aec9357f83.png',
    daily_volume: 529268,
    dex_id: '',
  },
  {
    id: 172,
    name: 'S',
    full_logo_url:
      'https://static.debank.com/image/app_token/logo_url/hyperliquid/17d88e82ee2f7243922c0f2d3de580ce.png',
    daily_volume: 517736,
    dex_id: '',
  },
  {
    id: 117,
    name: 'AR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AR/173858df36c11273f1cc2e6ab3fa68a0.png',
    daily_volume: 501001,
    dex_id: '',
  },
  {
    id: 158,
    name: 'ALGO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ALGO/85dfb81d3c01f97c7883de7368702c02.png',
    daily_volume: 489899,
    dex_id: '',
  },
  {
    id: 91,
    name: 'kLUNC',
    full_logo_url: null,
    daily_volume: 466343,
    dex_id: '',
  },
  {
    id: 24,
    name: 'SNX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SNX/2a58e4d0bfd4f2526b25af4789a17878.png',
    daily_volume: 458187,
    dex_id: '',
  },
  {
    id: 205,
    name: 'LINEA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LINEA/93dfba9903f062ec5f5243156451b7b2.png',
    daily_volume: 450555,
    dex_id: '',
  },
  {
    id: 210,
    name: '0G',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/0G/15aed5ab6b2ab20ad682505bbd753c8b.png',
    daily_volume: 445119,
    dex_id: '',
  },
  {
    id: 213,
    name: '2Z',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/2Z/58001e669a0c91cea3529ab67fefb52b.png',
    daily_volume: 432087,
    dex_id: '',
  },
  {
    id: 170,
    name: 'GRIFFAIN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GRIFFAIN/2b729760d4a6ee9c7de2ab7a9b621d79.png',
    daily_volume: 409737,
    dex_id: '',
  },
  {
    id: 135,
    name: 'IO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IO/732ba7ae710bc2694c5c201a9259d061.png',
    daily_volume: 399239,
    dex_id: '',
  },
  {
    id: 175,
    name: 'MELANIA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MELANIA/2fbec5080c3769b29aa2fa933cfbdb7b.png',
    daily_volume: 398886,
    dex_id: '',
  },
  {
    id: 75,
    name: 'MEME',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MEME/c596c4e59f466d913d29f3e34f3eabc6.png',
    daily_volume: 389750,
    dex_id: '',
  },
  {
    id: 134,
    name: 'BRETT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BRETT/76685304ade54755db9d9d3404925132.png',
    daily_volume: 387432,
    dex_id: '',
  },
  {
    id: 144,
    name: 'CELO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CELO/64c58c09a53aee566a604ab6b537ab89.png',
    daily_volume: 373694,
    dex_id: '',
  },
  {
    id: 36,
    name: 'YGG',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/YGG/10d8bffc1f06254f7c09e042b077a674.png',
    daily_volume: 359218,
    dex_id: '',
  },
  {
    id: 96,
    name: 'ACE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ACE/4f8276d74c590c8247d966373f730114.png',
    daily_volume: 358341,
    dex_id: '',
  },
  {
    id: 176,
    name: 'ANIME',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ANIME/880d35c6d510ac357e44addf37ae6c3b.png',
    daily_volume: 347892,
    dex_id: '',
  },
  {
    id: 69,
    name: 'GAS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GAS/f5b1e3704e607045920c65b8eb2da173.png',
    daily_volume: 343066,
    dex_id: '',
  },
  {
    id: 111,
    name: 'W',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/W/1b70458cc1c8ae58f36f2d900c57ac0c.png',
    daily_volume: 333801,
    dex_id: '',
  },
  {
    id: 133,
    name: 'TURBO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TURBO/b059f8fea0822de401e94bbc42ca5457.png',
    daily_volume: 325763,
    dex_id: '',
  },
  {
    id: 188,
    name: 'PROMPT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PROMPT/a8edbcc7641430b4c6bc9596da2d965d.png',
    daily_volume: 315389,
    dex_id: '',
  },
  {
    id: 101,
    name: 'ENS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ENS/ab162afbfc83427a854017777f4eebf4.png',
    daily_volume: 313394,
    dex_id: '',
  },
  {
    id: 140,
    name: 'RENDER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RENDER/0e666c4b6119f6676ea7248e76ab2cfa.png',
    daily_volume: 306697,
    dex_id: '',
  },
  {
    id: 76,
    name: 'ORDI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ORDI/46aae0b53d913f728c490b2860265418.png',
    daily_volume: 304446,
    dex_id: '',
  },
  {
    id: 21,
    name: 'CFX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CFX/d34e8324cc16d7fab04c160b15fd33c7.png',
    daily_volume: 302025,
    dex_id: '',
  },
  {
    id: 102,
    name: 'ETC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETC/40197b53916dfbf330851f40f22f7228.png',
    daily_volume: 295787,
    dex_id: '',
  },
  {
    id: 99,
    name: 'CAKE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CAKE/63f5e5145e398e6c01d03e90633b10b5.png',
    daily_volume: 282484,
    dex_id: '',
  },
  {
    id: 168,
    name: 'ZEREBRO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZEREBRO/ac69e36f55bcb71353d640366a9f911a.png',
    daily_volume: 274398,
    dex_id: '',
  },
  {
    id: 82,
    name: 'SUSHI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SUSHI/1fe94a5caf2d9d28505fd554a6757604.png',
    daily_volume: 265690,
    dex_id: '',
  },
  {
    id: 197,
    name: 'SOPH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SOPH/be5a939d2b57bd2040c90831e2dbc495.png',
    daily_volume: 263666,
    dex_id: '',
  },
  {
    id: 93,
    name: 'GALA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GALA/885f297f2654bd5eeed65f7c33073b77.png',
    daily_volume: 259328,
    dex_id: '',
  },
  {
    id: 193,
    name: 'INIT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/INIT/e6d5b200e01528f664aa19048e2f2c6b.png',
    daily_volume: 258458,
    dex_id: '',
  },
  {
    id: 211,
    name: 'HEMI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HEMI/4640fde4468f252ea991f579429ae46e.png',
    daily_volume: 248074,
    dex_id: '',
  },
  {
    id: 148,
    name: 'kNEIRO',
    full_logo_url: null,
    daily_volume: 228455,
    dex_id: '',
  },
  {
    id: 104,
    name: 'MANTA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MANTA/a1c3ef1a3ad01e0d4d53cb947af931a0.png',
    daily_volume: 225419,
    dex_id: '',
  },
  {
    id: 132,
    name: 'NOT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NOT/0fe07cde9a0b7969fdfa7915ee3ff0b9.png',
    daily_volume: 217140,
    dex_id: '',
  },
  {
    id: 49,
    name: 'BANANA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BANANA/05b43a6e0678603a95ab5efa9f3ab96b.png',
    daily_volume: 211389,
    dex_id: '',
  },
  {
    id: 209,
    name: 'STBL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/STBL/dcc88da5916306ed73e0e7a764bb4a7e.png',
    daily_volume: 210705,
    dex_id: '',
  },
  {
    id: 186,
    name: 'NIL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NIL/3bb4b45d7d7f5893594393a39f9076ef.png',
    daily_volume: 209333,
    dex_id: '',
  },
  {
    id: 201,
    name: 'PROVE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PROVE/6af7e93db2bc7351c267266ccb7b8051.png',
    daily_volume: 206695,
    dex_id: '',
  },
  {
    id: 62,
    name: 'BLUR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BLUR/34c4c5b57212747ae9fb0651ea7da283.png',
    daily_volume: 199444,
    dex_id: '',
  },
  {
    id: 23,
    name: 'GMX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GMX/fc8875ba2e2646e623efe86649d5b77b.png',
    daily_volume: 198998,
    dex_id: '',
  },
  {
    id: 108,
    name: 'ZETA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZETA/53b582a20cdd1ba834505f7026993a11.png',
    daily_volume: 197348,
    dex_id: '',
  },
  {
    id: 184,
    name: 'OM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/OM/70a3483325dd0df63ac2fb0e7a0816b2.png',
    daily_volume: 197045,
    dex_id: '',
  },
  {
    id: 167,
    name: 'AIXBT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AIXBT/9db66157df3bd9370376e0b32b0001d0.png',
    daily_volume: 189659,
    dex_id: '',
  },
  {
    id: 189,
    name: 'BABY',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BABY/1ced36e4a163d8c056f6dd2ab3a8b577.png',
    daily_volume: 187750,
    dex_id: '',
  },
  {
    id: 137,
    name: 'BLAST',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BLAST/959dfed2b26669bc8b1fb86fc2eaacd8.png',
    daily_volume: 187476,
    dex_id: '',
  },
  {
    id: 55,
    name: 'ARK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ARK/b2b6d697c9afa62004e918f4c2ebd9aa.png',
    daily_volume: 178119,
    dex_id: '',
  },
  {
    id: 190,
    name: 'WCT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WCT/b298a80efc43d9e157d94d6c907f0f3a.png',
    daily_volume: 177532,
    dex_id: '',
  },
  {
    id: 64,
    name: 'BSV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BSV/ba98cfefd4afa411005ea26acb9ceb48.png',
    daily_volume: 169435,
    dex_id: '',
  },
  {
    id: 87,
    name: 'SUPER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SUPER/9451601720defe72cfebac20bb01aa07.png',
    daily_volume: 166852,
    dex_id: '',
  },
  {
    id: 164,
    name: 'USUAL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/USUAL/7862b6d7c49077dacc0ff0eed1b2b867.png',
    daily_volume: 166629,
    dex_id: '',
  },
  {
    id: 169,
    name: 'BIO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BIO/cadab858c549652684ef77eafe30d2fa.png',
    daily_volume: 158534,
    dex_id: '',
  },
  {
    id: 41,
    name: 'RUNE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RUNE/3356fc71a1978018f6526f239ae1a986.png',
    daily_volume: 153967,
    dex_id: '',
  },
  {
    id: 60,
    name: 'KAS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/KAS/674bfebc051bcd3e28cc77a8b12cf65e.png',
    daily_volume: 152125,
    dex_id: '',
  },
  {
    id: 196,
    name: 'NXPC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NXPC/be30316522c214d985d15124c1af9bf3.png',
    daily_volume: 146902,
    dex_id: '',
  },
  {
    id: 78,
    name: 'NEO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEO/96711d81df85da70def29b8ac1b97a0c.png',
    daily_volume: 145641,
    dex_id: '',
  },
  {
    id: 120,
    name: 'BOME',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BOME/e65aedf1855d4fbb6752b8e1f92f929f.png',
    daily_volume: 145037,
    dex_id: '',
  },
  {
    id: 68,
    name: 'POLYX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POLYX/efa5d1a3f7331d43d684ef4da3319d0f.png',
    daily_volume: 142532,
    dex_id: '',
  },
  {
    id: 67,
    name: 'MINA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MINA/e475b696d23ee5f91e9dafe06300dcb0.png',
    daily_volume: 140667,
    dex_id: '',
  },
  {
    id: 107,
    name: 'ALT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ALT/8185b0bfd738168b96c95b144edf59fd.png',
    daily_volume: 140083,
    dex_id: '',
  },
  {
    id: 110,
    name: 'MAVIA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MAVIA/b7266b99c3fd5eb38c05aa567fcb0ad7.png',
    daily_volume: 139221,
    dex_id: '',
  },
  {
    id: 146,
    name: 'SCR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SCR/e06c04acdbfcf47f3fd34a1e3599b99a.png',
    daily_volume: 137651,
    dex_id: '',
  },
  {
    id: 50,
    name: 'TRB',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRB/dabee3195e93ef8ed53f45edf043db35.png',
    daily_volume: 134134,
    dex_id: '',
  },
  {
    id: 29,
    name: 'COMP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/COMP/500c26e44c699edec15c24aeb9cdfdeb.png',
    daily_volume: 132893,
    dex_id: '',
  },
  {
    id: 149,
    name: 'GOAT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GOAT/0fd6105931829a35cadd6f80522bf844.png',
    daily_volume: 131969,
    dex_id: '',
  },
  {
    id: 4,
    name: 'DYDX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DYDX/a4eb0608caa7c212d91e6364b6979dc0.png',
    daily_volume: 130435,
    dex_id: '',
  },
  {
    id: 191,
    name: 'HYPER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HYPER/94315e5b255d3983efa1b56bd0093568.png',
    daily_volume: 130138,
    dex_id: '',
  },
  {
    id: 182,
    name: 'LAYER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LAYER/2ac775ad1c9a9947c086220e867d9700.png',
    daily_volume: 130059,
    dex_id: '',
  },
  {
    id: 88,
    name: 'USTC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/USTC/6ece7316faedd94d184216b933736f22.png',
    daily_volume: 123330,
    dex_id: '',
  },
  {
    id: 145,
    name: 'HMSTR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HMSTR/503c90e39551bb5494701aa9fddd6bce.png',
    daily_volume: 121202,
    dex_id: '',
  },
  {
    id: 59,
    name: 'BIGTIME',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BIGTIME/57f499a1480e5656f6b58111e2da4e81.png',
    daily_volume: 115980,
    dex_id: '',
  },
  {
    id: 177,
    name: 'VINE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VINE/bced4e71d25c42b6a381ff8ea1a5139f.png',
    daily_volume: 111616,
    dex_id: '',
  },
  {
    id: 100,
    name: 'PEOPLE',
    full_logo_url: null,
    daily_volume: 107095,
    dex_id: '',
  },
  {
    id: 105,
    name: 'UMA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/UMA/4af61f4ed58fbbf892da38e60efef7f8.png',
    daily_volume: 100466,
    dex_id: '',
  },
  {
    id: 194,
    name: 'DOOD',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOOD/72d1ee60f6a42349c0d265dcddbfc1aa.png',
    daily_volume: 87977,
    dex_id: '',
  },
  {
    id: 124,
    name: 'TNSR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TNSR/c62422737c6930a3e3550f6328f0e3d7.png',
    daily_volume: 81208,
    dex_id: '',
  },
  {
    id: 157,
    name: 'IOTA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IOTA/14331cf947f04b0f1c2c8ad4aa554747.png',
    daily_volume: 79991,
    dex_id: '',
  },
  {
    id: 155,
    name: 'CHILLGUY',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CHILLGUY/cbd259b10f94c41722e6a2b9f9c463d3.png',
    daily_volume: 74723,
    dex_id: '',
  },
  {
    id: 139,
    name: 'MEW',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MEW/6455ba4fa8c684c34477fbd3eb980de3.png',
    daily_volume: 73676,
    dex_id: '',
  },
  {
    id: 160,
    name: 'ME',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ME/8a02439b4e5f9da6c025999eeb49c59a.png',
    daily_volume: 73226,
    dex_id: '',
  },
  {
    id: 86,
    name: 'GMT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GMT/22cd1da7df757948c5e91af4711bdf46.png',
    daily_volume: 70572,
    dex_id: '',
  },
  {
    id: 97,
    name: 'MAV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MAV/c31ec874558ff78f6c7f6fd0c4ccdf3e.png',
    daily_volume: 68607,
    dex_id: '',
  },
  {
    id: 109,
    name: 'DYM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DYM/0a3de877648ee25ab999628ea1c040d9.png',
    daily_volume: 59556,
    dex_id: '',
  },
  {
    id: 103,
    name: 'XAI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XAI/1d11e5ac6569eb6ae87be3906b63943d.png',
    daily_volume: 54457,
    dex_id: '',
  },
  {
    id: 181,
    name: 'TST',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TST/dd7460b1f1fc51c2a54bacc1f029a544.png',
    daily_volume: 49160,
    dex_id: '',
  },
  {
    id: 131,
    name: 'REZ',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/REZ/672151a68a2d4c0ef581dcb699f110e9.png',
    daily_volume: 47239,
    dex_id: '',
  },
  {
    id: 202,
    name: 'YZY',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/YZY/05f3e30a2a1ea94144ad1e0bb011dfe7.png',
    daily_volume: 42884,
    dex_id: '',
  },
  {
    id: 92,
    name: 'RSR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RSR/8dfe7d349e795cf523f8765595d8ffbc.png',
    daily_volume: 42160,
    dex_id: '',
  },
  {
    id: 51,
    name: 'FTT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FTT/a69a60c837f81b71cdd2ac1c6c4ebdbf.png',
    daily_volume: 28530,
    dex_id: '',
  },
] as PerpTopToken[];

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
