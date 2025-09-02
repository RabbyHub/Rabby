import { PerpTopToken } from '@rabby-wallet/rabby-api/dist/types';

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
};
export enum CANDLE_MENU_KEY {
  ONE_HOUR = '1H',
  ONE_DAY = '1D',
  ONE_WEEK = '1W',
  ONE_MONTH = '1M',
  YTD = 'YTD',
  ALL = 'ALL',
}

export const DEFAULT_TOP_ASSET = [
  {
    id: 1,
    name: 'ETH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETH/080c551d4527c48c664e2f9a42358c05.png',
    daily_volume: 5561174310,
  },
  {
    id: 0,
    name: 'BTC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BTC/da8784002998f4dbca0ad720ad10812f.png',
    daily_volume: 3470705727,
  },
  {
    id: 5,
    name: 'SOL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SOL/cf9836949424eb6c85cb04f386526134.png',
    daily_volume: 1122062141,
  },
  {
    id: 159,
    name: 'HYPE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HYPE/3640171ae0c3b46e6a465d278cf02d79.png',
    daily_volume: 456631634,
  },
  {
    id: 18,
    name: 'LINK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LINK/d4d3c2c5dbd014a03e36442e2c31a9a2.png',
    daily_volume: 188894542,
  },
  { id: 202, name: 'YZY', full_logo_url: null, daily_volume: 155996789 },
  {
    id: 25,
    name: 'XRP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XRP/b0abed5f6d58330a233bc7c244a6dd5d.png',
    daily_volume: 138440367,
  },
  { id: 204, name: 'WLFI', full_logo_url: null, daily_volume: 108655457 },
  {
    id: 165,
    name: 'FARTCOIN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FARTCOIN/7570a0003534d307ea94dc469df4774f.png',
    daily_volume: 103601918,
  },
  {
    id: 122,
    name: 'ENA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ENA/1d3a2258ecb310f52a33a87810c72a13.png',
    daily_volume: 87638043,
  },
  { id: 203, name: 'XPL', full_logo_url: null, daily_volume: 84741560 },
  {
    id: 200,
    name: 'PUMP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PUMP/17f68604935e1bea98a906c5807d1ce8.png',
    daily_volume: 65765698,
  },
  {
    id: 28,
    name: 'AAVE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AAVE/5c49848c770ed1f4f468a3b40bcbcdcb.png',
    daily_volume: 34430057,
  },
  {
    id: 12,
    name: 'DOGE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOGE/afd891241598726761558a25aab6a06e.png',
    daily_volume: 31436312,
  },
  {
    id: 7,
    name: 'BNB',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BNB/c2cd1be5eec797728b6abb756f73f735.png',
    daily_volume: 30201635,
  },
  {
    id: 14,
    name: 'SUI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SUI/216ac14f33c8e145cc85b8441a99a9e4.png',
    daily_volume: 27098239,
  },
  {
    id: 163,
    name: 'PENGU',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PENGU/7de952f2680865214557bb2df7494cb5.png',
    daily_volume: 23462136,
  },
  { id: 15, name: 'kPEPE', full_logo_url: null, daily_volume: 19655025 },
  { id: 85, name: 'kBONK', full_logo_url: null, daily_volume: 19088608 },
  {
    id: 11,
    name: 'ARB',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ARB/c333b72aaf0782c039357de0131e7b4c.png',
    daily_volume: 16801136,
  },
  {
    id: 169,
    name: 'BIO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BIO/45d6b2b34a68f530e22b76d4787cb42a.png',
    daily_volume: 14618221,
  },
  {
    id: 65,
    name: 'ADA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ADA/7cbadf4be8f16bbc12fadda88878d526.png',
    daily_volume: 14408173,
  },
  {
    id: 16,
    name: 'CRV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CRV/651c340dcab38fbb48e9fbf3765d885a.png',
    daily_volume: 11557965,
  },
  {
    id: 6,
    name: 'AVAX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AVAX/683a3e4ed6e4cc3f60990e41335109ba.png',
    daily_volume: 10396327,
  },
  {
    id: 17,
    name: 'LDO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LDO/e5344673ee5a332b1565aec36233d4a9.png',
    daily_volume: 10144324,
  },
  {
    id: 70,
    name: 'PENDLE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PENDLE/3fa9622e5b784bab20d346c3fff90c04.png',
    daily_volume: 9213456,
  },
  {
    id: 174,
    name: 'TRUMP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRUMP/a17d412d5e7f39327f31177f030c0afc.png',
    daily_volume: 8805962,
  },
  {
    id: 40,
    name: 'SEI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SEI/fd316145e4219f0c0198b1dd08a126cb.png',
    daily_volume: 6828984,
  },
  {
    id: 171,
    name: 'SPX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SPX/763fc4fdb016443b2fee8a30f1534cb3.png',
    daily_volume: 6786556,
  },
  {
    id: 180,
    name: 'BERA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BERA/75048c96c982027fa5dd4133d21b1185.png',
    daily_volume: 6645944,
  },
  {
    id: 10,
    name: 'LTC',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LTC/b55f550716370862025a732a2cb2fa24.png',
    daily_volume: 5731700,
  },
  {
    id: 192,
    name: 'ZORA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZORA/27f4d1b58aef0ebe16f56afe5ea81ef1.png',
    daily_volume: 5574226,
  },
  {
    id: 75,
    name: 'MEME',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MEME/c596c4e59f466d913d29f3e34f3eabc6.png',
    daily_volume: 5489761,
  },
  {
    id: 98,
    name: 'WIF',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WIF/84bbc41011231fb0cd53f27fed09363c.png',
    daily_volume: 5462647,
  },
  {
    id: 106,
    name: 'ONDO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ONDO/00b266668efa26d1b53b4d70b6bca73c.png',
    daily_volume: 4744704,
  },
  {
    id: 128,
    name: 'POPCAT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POPCAT/df6f2cd5a70f264a754da9fa223d1e5a.png',
    daily_volume: 4307924,
  },
  {
    id: 37,
    name: 'TRX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRX/077b94435d4413f247e1ade85ce9b6e1.png',
    daily_volume: 4272028,
  },
  {
    id: 123,
    name: 'MNT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MNT/8559ae2724c167936063e74124f92e66.png',
    daily_volume: 4153935,
  },
  {
    id: 31,
    name: 'WLD',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WLD/48811bfd61e58790bef369de9aadb205.png',
    daily_volume: 4054965,
  },
  {
    id: 195,
    name: 'LAUNCHCOIN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LAUNCHCOIN/65d0ffe2ef58e52b04b96aa9c962a1f3.png',
    daily_volume: 3598977,
  },
  {
    id: 183,
    name: 'IP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IP/672d11093fff9898fb7ed16484e55063.png',
    daily_volume: 3188587,
  },
  {
    id: 168,
    name: 'ZEREBRO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZEREBRO/ac69e36f55bcb71353d640366a9f911a.png',
    daily_volume: 3174350,
  },
  {
    id: 13,
    name: 'INJ',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/INJ/1d9e4f4c6542dd7b9b3590fd02a40bd1.png',
    daily_volume: 3161466,
  },
  {
    id: 48,
    name: 'DOT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOT/55195146091a42246c8e250e7770481b.png',
    daily_volume: 3024431,
  },
  {
    id: 63,
    name: 'TIA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TIA/fd707748b08e443e062501f1c421525a.png',
    daily_volume: 2884904,
  },
  {
    id: 66,
    name: 'TON',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TON/c9ee9c517023051e14511f481f75cf71.png',
    daily_volume: 2734283,
  },
  {
    id: 142,
    name: 'POL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POL/8b2f0684d578a2a35edb02f96cc1625d.png',
    daily_volume: 2596435,
  },
  {
    id: 74,
    name: 'NEAR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEAR/2395f489cec165cfa7011fcce8407795.png',
    daily_volume: 2596183,
  },
  {
    id: 173,
    name: 'MORPHO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MORPHO/a1c2039a8f2a9853a32c763edec18db5.png',
    daily_volume: 2569842,
  },
  {
    id: 9,
    name: 'OP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/OP/2d6e16c2385b808687bcdc1b64804f5d.png',
    daily_volume: 2549708,
  },
  {
    id: 172,
    name: 'S',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/S/ec66e8e374eb6cdb126bbef375a9de2a.png',
    daily_volume: 2484668,
  },
  {
    id: 27,
    name: 'APT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/APT/a6cf3aee5c9957228b54526f3463ef9e.png',
    daily_volume: 2409898,
  },
  {
    id: 187,
    name: 'PAXG',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PAXG/64142af26aa980f965ecfda67bc32b83.png',
    daily_volume: 2157421,
  },
  {
    id: 151,
    name: 'GRASS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GRASS/4d47ada2bb38659e40fc5b4604796df7.png',
    daily_volume: 2062321,
  },
  {
    id: 90,
    name: 'JUP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/JUP/a689b0796bd802d4f8ba7c17c1e11474.png',
    daily_volume: 2028144,
  },
  {
    id: 30,
    name: 'MKR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MKR/7b246dc2b1eb35423582d385b185e5f6.png',
    daily_volume: 1967070,
  },
  {
    id: 78,
    name: 'NEO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEO/96711d81df85da70def29b8ac1b97a0c.png',
    daily_volume: 1908164,
  },
  {
    id: 162,
    name: 'VIRTUAL',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VIRTUAL/c398edbae38e29eed19359dacde6fe60.png',
    daily_volume: 1800395,
  },
  {
    id: 177,
    name: 'VINE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VINE/bced4e71d25c42b6a381ff8ea1a5139f.png',
    daily_volume: 1752560,
  },
  {
    id: 39,
    name: 'UNI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/UNI/1c2eaa04051996f2d9b310cc3a92bb36.png',
    daily_volume: 1600685,
  },
  {
    id: 81,
    name: 'PYTH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PYTH/5aef5029c2364128c44b33aec9357f83.png',
    daily_volume: 1483669,
  },
  {
    id: 147,
    name: 'NEIROETH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEIROETH/c1d86b07f6ba71201b984720ecca28bc.png',
    daily_volume: 1474455,
  },
  {
    id: 154,
    name: 'XLM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XLM/6cb8cdb7b1207fd3922f3010d4fd8108.png',
    daily_volume: 1357726,
  },
  {
    id: 116,
    name: 'TAO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TAO/62eb5674c16ffc83e937cdf10f35faf8.png',
    daily_volume: 1343653,
  },
  {
    id: 127,
    name: 'HBAR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HBAR/652de1ec78938668e4b684b8999dc765.png',
    daily_volume: 1278198,
  },
  { id: 38, name: 'kSHIB', full_logo_url: null, daily_volume: 1274234 },
  {
    id: 152,
    name: 'PURR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PURR/26a90cc916ea70d7bb13ac5715db9ff0.png',
    daily_volume: 1231580,
  },
  {
    id: 155,
    name: 'CHILLGUY',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CHILLGUY/cbd259b10f94c41722e6a2b9f9c463d3.png',
    daily_volume: 1223533,
  },
  {
    id: 121,
    name: 'ETHFI',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETHFI/7bd4fb9d6be05e869a6ffb0f1f5422d4.png',
    daily_volume: 1172073,
  },
  {
    id: 184,
    name: 'OM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/OM/70a3483325dd0df63ac2fb0e7a0816b2.png',
    daily_volume: 1052915,
  },
  { id: 119, name: 'kFLOKI', full_logo_url: null, daily_volume: 1052337 },
  {
    id: 21,
    name: 'CFX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CFX/d34e8324cc16d7fab04c160b15fd33c7.png',
    daily_volume: 984072,
  },
  {
    id: 94,
    name: 'JTO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/JTO/a9fcb76426a701f63e52cd2bcb04402d.png',
    daily_volume: 942096,
  },
  {
    id: 146,
    name: 'SCR',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SCR/e06c04acdbfcf47f3fd34a1e3599b99a.png',
    daily_volume: 936110,
  },
  {
    id: 166,
    name: 'AI16Z',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AI16Z/2944339512e3d44cc008e7f113f421ad.png',
    daily_volume: 931119,
  },
  {
    id: 97,
    name: 'MAV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MAV/c31ec874558ff78f6c7f6fd0c4ccdf3e.png',
    daily_volume: 887296,
  },
  {
    id: 191,
    name: 'HYPER',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HYPER/94315e5b255d3983efa1b56bd0093568.png',
    daily_volume: 885767,
  },
  {
    id: 153,
    name: 'PNUT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PNUT/06e0eed45b89ba7f004c947045630990.png',
    daily_volume: 873358,
  },
  {
    id: 158,
    name: 'ALGO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ALGO/85dfb81d3c01f97c7883de7368702c02.png',
    daily_volume: 868443,
  },
  {
    id: 201,
    name: 'PROVE',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PROVE/6af7e93db2bc7351c267266ccb7b8051.png',
    daily_volume: 839329,
  },
  {
    id: 29,
    name: 'COMP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/COMP/500c26e44c699edec15c24aeb9cdfdeb.png',
    daily_volume: 801999,
  },
  {
    id: 105,
    name: 'UMA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/UMA/4af61f4ed58fbbf892da38e60efef7f8.png',
    daily_volume: 783016,
  },
  {
    id: 46,
    name: 'ZRO',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZRO/39fb78b21efbf2d25ada336a018ba400.png',
    daily_volume: 768159,
  },
  {
    id: 198,
    name: 'RESOLV',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RESOLV/c1fede25c213fde9b50ff208cd6de87a.png',
    daily_volume: 740792,
  },
  {
    id: 167,
    name: 'AIXBT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AIXBT/9db66157df3bd9370376e0b32b0001d0.png',
    daily_volume: 723626,
  },
  {
    id: 26,
    name: 'BCH',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BCH/58d69f12294597ffd78a1558fa8a1764.png',
    daily_volume: 686977,
  },
  {
    id: 150,
    name: 'MOODENG',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MOODENG/eea919702ea1af180b5c0b7f7dc69694.png',
    daily_volume: 685288,
  },
  {
    id: 130,
    name: 'EIGEN',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/EIGEN/78449fb4de33c698c7eee344cc04d618.png',
    daily_volume: 673624,
  },
  {
    id: 113,
    name: 'STRK',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/STRK/911a4d630daec8141c16619130a64fd6.png',
    daily_volume: 641142,
  },
  {
    id: 175,
    name: 'MELANIA',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MELANIA/2fbec5080c3769b29aa2fa933cfbdb7b.png',
    daily_volume: 634742,
  },
  {
    id: 50,
    name: 'TRB',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRB/dabee3195e93ef8ed53f45edf043db35.png',
    daily_volume: 631213,
  },
  {
    id: 111,
    name: 'W',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/W/4fbd40509fc5b4f44dc2d93e5abef15a.png',
    daily_volume: 624682,
  },
  {
    id: 199,
    name: 'SYRUP',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SYRUP/17c6387b60fe74663896f093ef3271f8.png',
    daily_volume: 602753,
  },
  {
    id: 19,
    name: 'STX',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/STX/79c0d5e0b29c8f54f983712c606ab9ab.png',
    daily_volume: 562624,
  },
  {
    id: 134,
    name: 'BRETT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BRETT/76685304ade54755db9d9d3404925132.png',
    daily_volume: 554457,
  },
  {
    id: 2,
    name: 'ATOM',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ATOM/2ce8e895c8ee9c5146ff7bc6c8fb82d5.png',
    daily_volume: 511403,
  },
  {
    id: 72,
    name: 'FET',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FET/5b2cbcaf4c4b67ddde2a040ab368e78b.png',
    daily_volume: 500370,
  },
  {
    id: 32,
    name: 'FXS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FXS/4face3026411119b3088a71c5a8ac363.png',
    daily_volume: 489706,
  },
  {
    id: 193,
    name: 'INIT',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/INIT/e6d5b200e01528f664aa19048e2f2c6b.png',
    daily_volume: 488363,
  },
  {
    id: 101,
    name: 'ENS',
    full_logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ENS/ab162afbfc83427a854017777f4eebf4.png',
    daily_volume: 468333,
  },
] as PerpTopToken[];

const INIT_PERPS_BUILD_FEE_RECEIVE_ADDRESS =
  '0xAd9bE64fD7a35d99a138b87CB212BAefbCDCf045';
export const PERPS_BUILD_FEE_RECEIVE_ADDRESS = INIT_PERPS_BUILD_FEE_RECEIVE_ADDRESS.toLowerCase();

export const PERPS_BUILD_FEE = 50; // '0.05%'

export const PERPS_MAX_NTL_VALUE = 10000000;

export const PERPS_REFERENCE_CODE = 'RABBYWALLET';

export const DELETE_AGENT_EMPTY_ADDRESS =
  '0x0000000000000000000000000000000000000000';
