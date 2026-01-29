const DEFAULT_TOKEN_ICON =
  'https://assets.debank.com/static/media/default.99a115ad939329c9a25b45d3cdecf56f.svg';

const TOKEN_ICON_MAP_PNG: Record<string, string> = {
  ETH:
    'https://static.debank.com/image/coin/logo_url/eth/6443cdccced33e204d90cb723c632917.png',
  WBTC:
    'https://static.debank.com/image/coin/logo_url/wbtc/6093319ef8f19931d7c2f94b817f53ea.png',
  USDT:
    'https://static.debank.com/image/coin/logo_url/usdt/23af7472292cb41dc39b3f1146ead0fe.png',
  EURC:
    'https://static-assets.rabby.io/files/505bb4f2-8307-40a5-a6e8-ed6db4dcf042.png',
  USDC:
    'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
  AAVE:
    'https://static.debank.com/image/eth_token/logo_url/0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9/7baf403c819f679dc1c6571d9d978f21.png',
  LINK:
    'https://static.debank.com/image/coin/logo_url/chainlink/ec9f53931b5e0ae59925b2cb3e593df5.png',
  DAI:
    'https://static.debank.com/image/coin/logo_url/dai/2eba06def7ef8749c028514b2a393165.png',
  BAL:
    'https://static.debank.com/image/eth_token/logo_url/0xba100000625a3754423978a60c9317c58a424e3d/52990c207f4001bd9090dfd90e54374a.png',
  EUROC:
    'https://static.debank.com/image/eth_token/logo_url/0x1abaea1f7c830bd89acc67ec4af516284b1bc33c/08e1b4214f9f2c9a0744c74ff08761f1.png',
  CRV:
    'https://static.debank.com/image/eth_token/logo_url/0xd533a949740bb3306d119cc777fa900ba034cd52/38f4cbac8fb4ac70c384a65ae0cca337.png',
  UNI:
    'https://static.debank.com/image/coin/logo_url/UNI/47811c297b7e925efb3d9baddf972bd7.png',
  LDO:
    'https://static.debank.com/image/coin/logo_url/lido/c3268bfb377ea85bcb6cab65a6044713.png',
  MKR:
    'https://static.debank.com/image/coin/logo_url/maker/877d4705fd92e43afa5c436588abd235.png',
  '1INCH':
    'https://static.debank.com/image/eth_token/logo_url/0x111111111117dc0aa78b770fa6a738034120c302/2441b15b32406dc7d163ba4c1c6981d3.png',
  RPL:
    'https://static.debank.com/image/eth_token/logo_url/0xd33526068d116ce69f19a9ee46f0bd304f21a51f/0dac0c5e1dd543fb62581f0756e0b11f.png',
  LUSD:
    'https://static.debank.com/image/eth_token/logo_url/0x5f98805a4e8be255a32880fdec7f6728c6568ba0/842c789889d392cd0d54c30451d4239f.png',
  'LEGACY FRAX':
    'https://static.debank.com/image/coin/logo_url/legacy_frax/e9ed792d23e1b9f0449b650a411006d5.png',
  SNX:
    'https://static.debank.com/image/eth_token/logo_url/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f/fb568c26c7902169572abe8fa966e791.png',
  ENS:
    'https://static.debank.com/image/eth_token/logo_url/0xc18360217d8f7ab5e7c516566761ea12ce7f9d72/034d454d78d7be7f9675066fdb63e114.png',

  STETH:
    'https://static.debank.com/image/eth_token/logo_url/0xae7ab96520de3a18e5e111b5eaab095312d7fe84/e4f2c8b4d0b254fe8e04880ff76d872e.png',
  CBBTC:
    'https://static.debank.com/image/eth_token/logo_url/0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf/a4ae837a6ca2fc45f07a74898cc4ba45.png',
  USDE:
    'https://static.debank.com/image/eth_token/logo_url/0x4c9edd5852cd905f086c759e8383e09bff1e68b3/1228d6e73f70f37ec1f6fe02a3bbe6ff.png',
  OSETH:
    'https://static.debank.com/image/eth_token/logo_url/0xf1c9acdc66974dfb6decb12aa385b9cd01190e38/4b9f533a91f012c8b142dd3b0755adae.png',
  RLUSD:
    'https://static.debank.com/image/eth_token/logo_url/0x8292bb45bf1ee4d140127049757c2e0ff06317ed/d7ea2a4be87b2df635d12b77b99dcc24.png',
  LBTC:
    'https://static.debank.com/image/eth_token/logo_url/0x8236a87084f8b84306f72007f36f2618a5634494/e63f839c2285bae18b83e42853bc0cf2.png',
  TBTC:
    'https://static.debank.com/image/eth_token/logo_url/0x18084fba666a33d37592fa2633fd49a74dd93a88/81d0f366026c3480d25d3c1dfa5b60d3.png',
  USCC:
    'https://static.debank.com/image/eth_token/logo_url/0x14d60e7fdc0d71d8611742720e4c50e7a974020c/e8a4d40c295db75998a4dc97b935ad85.png',
  PYUSD:
    'https://static.debank.com/image/eth_token/logo_url/0x6c3ea9036406852006290770bedfcaba0e23a0e8/8af98a6a2c36c107eeb4b349fddb51b0.png',
  FBTC:
    'https://static-assets.debank.com/files/15048fad-89ae-4248-9200-93b296fd3d2e.png',
  USDTB:
    'https://static.debank.com/image/eth_token/logo_url/0xc139190f447e929f090edeb554d95abb8b18ac1c/8bb5a15dce452282f8bd987d29a6746d.png',
  LTF:
    'https://static.debank.com/image/base_token/logo_url/0x8c213ee79581ff4984583c6a801e5263418c4b86/df46d2f49ff2097c72c070583efc92bf.png',
  USDS:
    'https://static.debank.com/image/eth_token/logo_url/0xdc035d45d973e3ec169d2276ddab16f1e407384f/78fbc2e73e33fa80fcecfaafa2074887.png',
  CBETH:
    'https://static.debank.com/image/eth_token/logo_url/0xbe9895146f7af43049ca1c1ae358b0541ea49704/1f287272a7d8439af0f6b281ebf0143e.png',
  XAUT:
    'https://static.debank.com/image/eth_token/logo_url/0x68749665ff8d2d112fa859aa293f07a622782f38/a100487c27e4e6e5557ef770230c7f8b.png',
  JAAA:
    'https://static.debank.com/image/eth_token/logo_url/0x5a0f93d040de44e78f251b03c43be9cf317dcf64/6e8dbde004a07f7ac158c5c11de6e2dd.png',
  USTB:
    'https://static-assets.rabby.io/files/e4bd95bd-49b3-43f3-a6ee-08d70f568edc.png',
  CRVUSD:
    'https://static.debank.com/image/eth_token/logo_url/0xf939e0a03fb07f59a73314e73794be0e57ac1b4e/0eb208f018ae08f504b2c201172b8eea.png',
  KNC:
    'https://static.debank.com/image/eth_token/logo_url/0xdefa4e8a7bcba345f687a2f1456f5edd9ce97202/1d25e188deb06e642ea6f4f4f8eb0a0c.png',

  WETH:
    'https://static.debank.com/image/eth_token/logo_url/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2/61844453e63cf81301f845d7864236f6.png',
  GHO:
    'https://static.debank.com/image/eth_token/logo_url/0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f/1fd570eeab44b1c7afad2e55b5545c42.png',
  STG:
    'https://static-assets.rabby.io/files/83bc76ac-f290-4f3c-975a-acec90c793c7.png',
  FXS:
    'https://static-assets.rabby.io/files/fed43537-b696-4eaf-8c64-6e1957a1ab47.png',
  WSTETH:
    'https://static-assets.rabby.io/files/35f0feed-fc73-410f-a791-09f1689ff0e5.png',
  RETH:
    'https://static-assets.rabby.io/files/5bc38419-1ebc-46f1-8ebc-522781294f41.png',
  SDAI:
    'https://static-assets.rabby.io/files/e2eee32f-702a-481a-9c9b-2378000c6487.png',
  WEETH:
    'https://static-assets.rabby.io/files/36d11fd4-07d7-4774-bced-9286a823b15e.png',
  ETHX:
    'https://static-assets.rabby.io/files/e745bb0f-e274-4b66-84fd-7fcacc3646a9.png',
  SUSDE:
    'https://static-assets.rabby.io/files/a3dbad44-1c77-48ea-8bd2-bb53fb5409e2.png',
  RSETH:
    'https://static-assets.rabby.io/files/6b7e6690-4d18-4d09-9a49-af349024a219.png',
  EBTC:
    'https://static-assets.rabby.io/files/7c90711e-5b89-4640-ab44-e811573fe74b.png',
  EUSDE:
    'https://static-assets.rabby.io/files/efac9228-4433-4540-96a7-ea5dc11e098e.png',
  TETH:
    'https://static-assets.rabby.io/files/a1f3f0a4-a006-4849-82b7-b4ae9a2b3caf.png',
  EZETH:
    'https://static-assets.rabby.io/files/75e716a2-aafe-4938-80a2-a4513431ddc1.png',
  STS:
    'https://static-assets.rabby.io/files/6bc31d76-804d-4336-8db8-e090f23008cf.png',
  S:
    'https://static-assets.rabby.io/files/b82096fc-bc8b-498d-a67e-5388b6f3c5b8.png',
  WS:
    'https://static-assets.rabby.io/files/b82096fc-bc8b-498d-a67e-5388b6f3c5b8.png',
  USDBC:
    'https://static-assets.rabby.io/files/c39dd104-fd43-4a2c-9936-a557d3d73350.png',
  WRSETH:
    'https://static-assets.rabby.io/files/38e4a233-fc5e-48fb-b476-5925da82ad48.png',
  'PT-EUSDE-29MAY2025': DEFAULT_TOKEN_ICON,
  'PT-SUSDE-31JUL2025': DEFAULT_TOKEN_ICON,
  'PT-USDE-31JUL2025': DEFAULT_TOKEN_ICON,
  'PT-EUSDE-14AUG2025': DEFAULT_TOKEN_ICON,
  'PT-SUSDE-25SEP2025': DEFAULT_TOKEN_ICON,
  'PT-USDE-25SEP2025': DEFAULT_TOKEN_ICON,
  'PT-SUSDE-27NOV2025': DEFAULT_TOKEN_ICON,
  'PT-USDE-27NOV2025': DEFAULT_TOKEN_ICON,
  'USD₮0':
    'https://static-assets.rabby.io/files/5f83f08d-5790-4b74-96b8-5dcc09610fa4.png',
  USDT0:
    'https://static-assets.rabby.io/files/5f83f08d-5790-4b74-96b8-5dcc09610fa4.png',
  ARB:
    'https://static-assets.rabby.io/files/049db229-35e7-4e9e-8612-f8ed048f8459.png',
  WBNB:
    'https://static-assets.rabby.io/files/b276260b-a977-457e-979a-def28dc2a930.png',
  AVAX:
    'https://static-assets.rabby.io/files/4aa19a1f-bd5f-4212-abd1-e59fbf9bc510.png',
  WAVAX:
    'https://static-assets.rabby.io/files/40eca7ff-0fb0-42a0-9054-661e2f90af7a.png',
  AUSD:
    'https://static-assets.rabby.io/files/c7a1b7e0-20ec-4644-9b42-477411a3f85b.png',
  BTC:
    'https://static-assets.rabby.io/files/68c40b30-5a14-447f-8085-753b344ba405.png',
  BTCB:
    'https://static-assets.rabby.io/files/68c40b30-5a14-447f-8085-753b344ba405.png',
  OP:
    'https://static-assets.rabby.io/files/74896c15-b767-46e9-825d-832c3445a312.png',
  VBILL:
    'https://static-assets.rabby.io/files/24ed25cc-d329-460d-87b0-b431e337656a.png',
  JTRSY:
    'https://static-assets.rabby.io/files/4ec65031-c6a0-4372-899c-7ba1d36211a5.png',
  USYC:
    'https://static-assets.rabby.io/files/4e87a45b-b07a-4bbe-acc6-33821032f72a.png',
  XAUT0:
    'https://static-assets.rabby.io/files/d2d6b3fa-3f6c-4d8c-842e-c8c435bbfad7.png',
  SAVAX:
    'https://static-assets.rabby.io/files/b661d4e9-365b-4a35-b85c-c00eed048b12.png',
  SYRUPUSDT:
    'https://static-assets.rabby.io/files/21a2d068-400e-4e58-a7f1-0495511e85cd.png',
  PTUSDE:
    'https://static-assets.rabby.io/files/d71269b4-9e4e-42e1-84ed-f1ba23fcb732.png',
  PTSUSDE:
    'https://static-assets.rabby.io/files/2d03b296-daab-4e6c-93ed-4605ba7dc603.png',
  PTEUSDE:
    'https://static-assets.rabby.io/files/5a495b43-b19d-4885-95f9-b387fddab86e.png',
  WPOL:
    'https://static-assets.rabby.io/files/ba9bd2eb-9b58-4f0f-b695-5ad15da5c4e5.png',
  MATICX:
    'https://static-assets.rabby.io/files/b8fd04a6-83a7-4758-b52c-99becb93e7d3.png',
  WXDAI:
    'https://static-assets.rabby.io/files/7ebd98d6-581d-4b16-aede-c951ae47a6b8.png',
  GNO:
    'https://static-assets.rabby.io/files/44c9e6f8-3dfa-4c72-88e6-f123228cd89d.png',
  EURE:
    'https://static-assets.rabby.io/files/1b6fda16-3ae6-4c19-916b-b3aa0eea126f.png',
  FDUSD:
    'https://static-assets.rabby.io/files/7dc2e801-5a7e-417d-945c-ad7bb164fcb7.png',
  CELO:
    'https://static-assets.rabby.io/files/2c523482-ea14-4180-9e90-d3c6324a8f11.png',
  CUSD:
    'https://static-assets.rabby.io/files/b9d5a8d3-740b-4338-b0b8-ef4b164050a6.png',
  CEUR:
    'https://static-assets.rabby.io/files/e427d696-7095-46a0-9c36-d276fcd6b33c.png',
  FRAX:
    'https://static-assets.rabby.io/files/74b23562-f37e-4a18-93b7-9b3fb176184a.png',
  SUSD:
    'https://static-assets.rabby.io/files/f9e485f8-edb7-4375-96f9-a8491f2fb51d.png',
  XPL:
    'https://static-assets.rabby.io/files/dc6638bd-f688-4757-91df-9e27c6102ed0.png',
  WXPL:
    'https://static-assets.rabby.io/files/cf7a3f2b-1ebb-4fd1-b883-5cf72d093f24.png',
  POL:
    'https://static-assets.rabby.io/files/3cb5bbdd-ec74-408b-a95f-0a7b0c9973ca.png',
  EURS:
    'https://static-assets.rabby.io/files/d0465c41-ad12-465f-bbe3-5a7f42314645.png',
  GHST:
    'https://static-assets.rabby.io/files/8e685254-6b89-4bec-9b3c-9db19f521f3c.png',
  KBTC:
    'https://static-assets.rabby.io/files/0f30587f-7b31-4098-a679-73fa22b78709.png',
  USDG:
    'https://static-assets.rabby.io/files/9615e9e1-231f-4063-b1dd-84a755f7a1f5.png',
  XDAI:
    'https://static-assets.rabby.io/files/b82f75fe-514a-4926-9ab5-5c668f520aea.png',
  CAKE:
    'https://static-assets.rabby.io/files/71490946-25b2-4307-8e6a-5c7fbef518c7.png',
  BNB:
    'https://static-assets.rabby.io/files/02b6bbb1-65f4-444e-9439-033639720469.png',
  SCR:
    'https://static-assets.rabby.io/files/b69ed5d4-b667-4b69-b7d0-5bf08c8c3bae.png',
  ZK:
    'https://static-assets.rabby.io/files/b71635b6-dafb-41a0-b81c-448ed5a3acf0.png',
  METIS:
    'https://static-assets.rabby.io/files/caf96810-0b51-4304-9a44-72ab9c13028a.png',
};

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

export const getTokenIcon = (symbol: string): string => {
  if (!symbol) {
    return DEFAULT_TOKEN_ICON;
  }
  const matchSymbol = SYMBOL_MAP[symbol] || symbol;
  const lowerMatch = TOKEN_ICON_MAP_PNG[matchSymbol.toUpperCase()];
  if (lowerMatch) {
    return lowerMatch;
  }

  return DEFAULT_TOKEN_ICON;
};
