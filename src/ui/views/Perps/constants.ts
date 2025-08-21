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
    id: 'ETH',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETH/080c551d4527c48c664e2f9a42358c05.png',
  },
  {
    id: 'BTC',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BTC/da8784002998f4dbca0ad720ad10812f.png',
  },
  {
    id: 'SOL',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SOL/cf9836949424eb6c85cb04f386526134.png',
  },
  {
    id: 'HYPE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HYPE/3640171ae0c3b46e6a465d278cf02d79.png',
  },
  {
    id: 'LINK',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LINK/d4d3c2c5dbd014a03e36442e2c31a9a2.png',
  },
  {
    id: 'XRP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XRP/b0abed5f6d58330a233bc7c244a6dd5d.png',
  },
  {
    id: 'FARTCOIN',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FARTCOIN/7570a0003534d307ea94dc469df4774f.png',
  },
  {
    id: 'ENA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ENA/1d3a2258ecb310f52a33a87810c72a13.png',
  },
  { id: 'YZY', logo_url: null },
  {
    id: 'PUMP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PUMP/17f68604935e1bea98a906c5807d1ce8.png',
  },
  {
    id: 'SUI',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SUI/216ac14f33c8e145cc85b8441a99a9e4.png',
  },
  {
    id: 'DOGE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOGE/afd891241598726761558a25aab6a06e.png',
  },
  {
    id: 'BNB',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BNB/c2cd1be5eec797728b6abb756f73f735.png',
  },
  {
    id: 'PENGU',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PENGU/7de952f2680865214557bb2df7494cb5.png',
  },
  { id: 'kPEPE', logo_url: null },
  {
    id: 'ADA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ADA/7cbadf4be8f16bbc12fadda88878d526.png',
  },
  {
    id: 'AAVE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AAVE/5c49848c770ed1f4f468a3b40bcbcdcb.png',
  },
  {
    id: 'CRV',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CRV/651c340dcab38fbb48e9fbf3765d885a.png',
  },
  { id: 'kBONK', logo_url: null },
  {
    id: 'ARB',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ARB/c333b72aaf0782c039357de0131e7b4c.png',
  },
  {
    id: 'LDO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LDO/e5344673ee5a332b1565aec36233d4a9.png',
  },
  {
    id: 'BIO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BIO/45d6b2b34a68f530e22b76d4787cb42a.png',
  },
  {
    id: 'AVAX',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AVAX/683a3e4ed6e4cc3f60990e41335109ba.png',
  },
  {
    id: 'ZORA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZORA/27f4d1b58aef0ebe16f56afe5ea81ef1.png',
  },
  {
    id: 'SPX',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SPX/763fc4fdb016443b2fee8a30f1534cb3.png',
  },
  {
    id: 'LTC',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LTC/b55f550716370862025a732a2cb2fa24.png',
  },
  {
    id: 'SEI',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SEI/fd316145e4219f0c0198b1dd08a126cb.png',
  },
  {
    id: 'MEME',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MEME/c596c4e59f466d913d29f3e34f3eabc6.png',
  },
  {
    id: 'WIF',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WIF/84bbc41011231fb0cd53f27fed09363c.png',
  },
  {
    id: 'PENDLE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PENDLE/3fa9622e5b784bab20d346c3fff90c04.png',
  },
  {
    id: 'TRUMP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRUMP/a17d412d5e7f39327f31177f030c0afc.png',
  },
  {
    id: 'CFX',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CFX/d34e8324cc16d7fab04c160b15fd33c7.png',
  },
  {
    id: 'BERA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BERA/75048c96c982027fa5dd4133d21b1185.png',
  },
  {
    id: 'MNT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MNT/8559ae2724c167936063e74124f92e66.png',
  },
  {
    id: 'POPCAT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POPCAT/df6f2cd5a70f264a754da9fa223d1e5a.png',
  },
  {
    id: 'ONDO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ONDO/00b266668efa26d1b53b4d70b6bca73c.png',
  },
  {
    id: 'S',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/S/ec66e8e374eb6cdb126bbef375a9de2a.png',
  },
  {
    id: 'TRX',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TRX/077b94435d4413f247e1ade85ce9b6e1.png',
  },
  {
    id: 'VIRTUAL',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VIRTUAL/c398edbae38e29eed19359dacde6fe60.png',
  },
  {
    id: 'INJ',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/INJ/1d9e4f4c6542dd7b9b3590fd02a40bd1.png',
  },
  {
    id: 'WLD',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/WLD/48811bfd61e58790bef369de9aadb205.png',
  },
  {
    id: 'MKR',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MKR/7b246dc2b1eb35423582d385b185e5f6.png',
  },
  {
    id: 'IP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IP/672d11093fff9898fb7ed16484e55063.png',
  },
  {
    id: 'OP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/OP/2d6e16c2385b808687bcdc1b64804f5d.png',
  },
  {
    id: 'UNI',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/UNI/1c2eaa04051996f2d9b310cc3a92bb36.png',
  },
  {
    id: 'JUP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/JUP/a689b0796bd802d4f8ba7c17c1e11474.png',
  },
  {
    id: 'POL',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/POL/8b2f0684d578a2a35edb02f96cc1625d.png',
  },
  {
    id: 'NEO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEO/96711d81df85da70def29b8ac1b97a0c.png',
  },
  {
    id: 'TON',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TON/c9ee9c517023051e14511f481f75cf71.png',
  },
  {
    id: 'LAUNCHCOIN',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/LAUNCHCOIN/65d0ffe2ef58e52b04b96aa9c962a1f3.png',
  },
  {
    id: 'TIA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TIA/fd707748b08e443e062501f1c421525a.png',
  },
  {
    id: 'DOT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/DOT/55195146091a42246c8e250e7770481b.png',
  },
  {
    id: 'APT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/APT/a6cf3aee5c9957228b54526f3463ef9e.png',
  },
  {
    id: 'VINE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/VINE/bced4e71d25c42b6a381ff8ea1a5139f.png',
  },
  {
    id: 'GRASS',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/GRASS/4d47ada2bb38659e40fc5b4604796df7.png',
  },
  {
    id: 'ZEREBRO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZEREBRO/ac69e36f55bcb71353d640366a9f911a.png',
  },
  {
    id: 'HYPER',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HYPER/94315e5b255d3983efa1b56bd0093568.png',
  },
  {
    id: 'XLM',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/XLM/6cb8cdb7b1207fd3922f3010d4fd8108.png',
  },
  {
    id: 'NEAR',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEAR/2395f489cec165cfa7011fcce8407795.png',
  },
  {
    id: 'MORPHO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MORPHO/a1c2039a8f2a9853a32c763edec18db5.png',
  },
  {
    id: 'PAXG',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PAXG/64142af26aa980f965ecfda67bc32b83.png',
  },
  {
    id: 'TAO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/TAO/62eb5674c16ffc83e937cdf10f35faf8.png',
  },
  {
    id: 'HBAR',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/HBAR/652de1ec78938668e4b684b8999dc765.png',
  },
  {
    id: 'KAITO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/KAITO/bcea2bf670392ef8f802ce3057badb74.png',
  },
  {
    id: 'CHILLGUY',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/CHILLGUY/cbd259b10f94c41722e6a2b9f9c463d3.png',
  },
  {
    id: 'SYRUP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SYRUP/17c6387b60fe74663896f093ef3271f8.png',
  },
  {
    id: 'PYTH',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PYTH/5aef5029c2364128c44b33aec9357f83.png',
  },
  {
    id: 'ETHFI',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ETHFI/7bd4fb9d6be05e869a6ffb0f1f5422d4.png',
  },
  {
    id: 'ZRO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZRO/39fb78b21efbf2d25ada336a018ba400.png',
  },
  { id: 'kSHIB', logo_url: null },
  {
    id: 'PNUT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PNUT/06e0eed45b89ba7f004c947045630990.png',
  },
  {
    id: 'FXS',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FXS/4face3026411119b3088a71c5a8ac363.png',
  },
  {
    id: 'ALGO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ALGO/85dfb81d3c01f97c7883de7368702c02.png',
  },
  {
    id: 'RUNE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RUNE/3356fc71a1978018f6526f239ae1a986.png',
  },
  {
    id: 'UMA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/UMA/4af61f4ed58fbbf892da38e60efef7f8.png',
  },
  {
    id: 'NEIROETH',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/NEIROETH/c1d86b07f6ba71201b984720ecca28bc.png',
  },
  {
    id: 'BCH',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BCH/58d69f12294597ffd78a1558fa8a1764.png',
  },
  { id: 'kFLOKI', logo_url: null },
  {
    id: 'SCR',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/SCR/e06c04acdbfcf47f3fd34a1e3599b99a.png',
  },
  {
    id: 'AIXBT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AIXBT/9db66157df3bd9370376e0b32b0001d0.png',
  },
  {
    id: 'AI16Z',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/AI16Z/2944339512e3d44cc008e7f113f421ad.png',
  },
  {
    id: 'EIGEN',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/EIGEN/78449fb4de33c698c7eee344cc04d618.png',
  },
  {
    id: 'ZK',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ZK/4e1141b54d8b4305184a88777c5d86f8.png',
  },
  {
    id: 'PROVE',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PROVE/6af7e93db2bc7351c267266ccb7b8051.png',
  },
  {
    id: 'MAV',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MAV/c31ec874558ff78f6c7f6fd0c4ccdf3e.png',
  },
  {
    id: 'INIT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/INIT/e6d5b200e01528f664aa19048e2f2c6b.png',
  },
  {
    id: 'BRETT',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/BRETT/76685304ade54755db9d9d3404925132.png',
  },
  {
    id: 'RENDER',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RENDER/0e666c4b6119f6676ea7248e76ab2cfa.png',
  },
  {
    id: 'MOODENG',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MOODENG/eea919702ea1af180b5c0b7f7dc69694.png',
  },
  {
    id: 'RESOLV',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/RESOLV/c1fede25c213fde9b50ff208cd6de87a.png',
  },
  {
    id: 'COMP',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/COMP/500c26e44c699edec15c24aeb9cdfdeb.png',
  },
  {
    id: 'PURR',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/PURR/26a90cc916ea70d7bb13ac5715db9ff0.png',
  },
  {
    id: 'MELANIA',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/MELANIA/2fbec5080c3769b29aa2fa933cfbdb7b.png',
  },
  {
    id: 'W',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/W/4fbd40509fc5b4f44dc2d93e5abef15a.png',
  },
  {
    id: 'FET',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FET/5b2cbcaf4c4b67ddde2a040ab368e78b.png',
  },
  {
    id: 'JTO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/JTO/a9fcb76426a701f63e52cd2bcb04402d.png',
  },
  { id: 'kNEIRO', logo_url: null },
  {
    id: 'IO',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/IO/732ba7ae710bc2694c5c201a9259d061.png',
  },
  {
    id: 'FIL',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/FIL/4b76933c8bd5910e1808d44520643c5f.png',
  },
  {
    id: 'ATOM',
    logo_url:
      'https://static.debank.com/image/hyper_liquid/logo_url/ATOM/2ce8e895c8ee9c5146ff7bc6c8fb82d5.png',
  },
];
