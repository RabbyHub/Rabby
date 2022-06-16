import { Chain } from 'background/service/openapi';
import IconEthLogo from 'ui/assets/chain-logos/eth.svg';
import IconEthWhiteLogo from 'ui/assets/chain-logos/eth-white.svg';
import IconHecoLogo from 'ui/assets/chain-logos/heco.svg';
import IconHecoWhiteLogo from 'ui/assets/chain-logos/heco-white.svg';
import IconBscLogo from 'ui/assets/chain-logos/bsc.svg';
import IconBscWhiteLogo from 'ui/assets/chain-logos/bsc-white.svg';
import IconDaiLogo from 'ui/assets/chain-logos/gnosis.svg';
import IconDaiWhiteLogo from 'ui/assets/chain-logos/gnosis-white.svg';
import IconPolygonLogo from 'ui/assets/chain-logos/polygon.svg';
import IconPolygonWhiteLogo from 'ui/assets/chain-logos/polygon-white.svg';
import IconFantom from 'ui/assets/chain-logos/fantom.svg';
import IconFantomWhiteLogo from 'ui/assets/chain-logos/fantom-white.svg';
import IconOKTLogo from 'ui/assets/chain-logos/okex.svg';
import IconOKTWhiteLogo from 'ui/assets/chain-logos/okex-white.svg';
import IconMetisLogo from 'ui/assets/chain-logos/metis.svg';
import IconMetisWhiteLogo from 'ui/assets/chain-logos/metis-white.svg';
import IconArbitrumLogo from 'ui/assets/chain-logos/arbitrum.svg';
import IconArbitrumWhiteLogo from 'ui/assets/chain-logos/arbitrum-white.svg';
import IconHarmonyLogo from 'ui/assets/chain-logos/harmony.svg';
import IconHarmonyWhiteLogo from 'ui/assets/chain-logos/harmony-white.svg';
import IconAstarLogo from 'ui/assets/chain-logos/astar.png';
import IconAstarWhiteLogo from 'ui/assets/chain-logos/astar-white.svg';
import IconOPLogo from 'ui/assets/chain-logos/op.svg';
import IconOPWhiteLogo from 'ui/assets/chain-logos/op-white.svg';
import IconAvaxLogo from 'ui/assets/chain-logos/avax.svg';
import IconAvaxWhiteLogo from 'ui/assets/chain-logos/avax-white.svg';
import IconRoseLogo from 'ui/assets/chain-logos/rose.svg';
import IconRoseWhiteLogo from 'ui/assets/chain-logos/rose-white.svg';
import IconCeloLogo from 'ui/assets/chain-logos/celo.svg';
import IconCeloWhiteLogo from 'ui/assets/chain-logos/celo-white.svg';
import IconMoonriverLogo from 'ui/assets/chain-logos/movr.svg';
import IconMoonriverWhiteLogo from 'ui/assets/chain-logos/movr-white.svg';
import IconCronosLogo from 'ui/assets/chain-logos/cronos.svg';
import IconCronosWhiteLogo from 'ui/assets/chain-logos/cronos-white.svg';
import IconBobaLogo from 'ui/assets/chain-logos/boba.png';
import IconBobaWhiteLogo from 'ui/assets/chain-logos/boba-white.svg';
import IconBttLogo from 'ui/assets/chain-logos/bttc.svg';
import IconBttWhiteLogo from 'ui/assets/chain-logos/bttc-white.svg';
import IconAuroraLogo from 'ui/assets/chain-logos/aurora.svg';
import IconAuroraWhiteLogo from 'ui/assets/chain-logos/aurora-white.svg';
import IconMobmLogo from 'ui/assets/chain-logos/mobm.svg';
import IconMobmWhiteLogo from 'ui/assets/chain-logos/mobm-white.svg';
import IconSbchLogo from 'ui/assets/chain-logos/smartBCH.svg';
import IconSbchWhiteLogo from 'ui/assets/chain-logos/smartBCH-white.svg';
import IconFuseLogo from 'ui/assets/chain-logos/fuse.svg';
import IconFuseWhiteLogo from 'ui/assets/chain-logos/fuse-white.svg';
import IconPalmLogo from 'ui/assets/chain-logos/palm.svg';
import IconPalmWhiteLogo from 'ui/assets/chain-logos/palm-white.svg';
import IconShidenLogo from 'ui/assets/chain-logos/shiden.svg';
import IconShidenWhiteLogo from 'ui/assets/chain-logos/shiden-white.svg';
import IconKlaytnLogo from 'ui/assets/chain-logos/klaytn.svg';
import IconKlaytnWhiteLogo from 'ui/assets/chain-logos/klaytn-white.svg';
import IconIotxLogo from 'ui/assets/chain-logos/iotx.svg';
import IconIotxWhiteLogo from 'ui/assets/chain-logos/iotx-white.svg';
import IconRSKLogo from 'ui/assets/chain-logos/rsk.svg';
import IconRSKWhiteLogo from 'ui/assets/chain-logos/rsk-white.svg';
import IconWanLogo from 'ui/assets/chain-logos/wanchain.svg';
import IconWanWhiteLogo from 'ui/assets/chain-logos/wanchain-white.svg';
import IconKCCLogo from 'ui/assets/chain-logos/kcc.svg';
import IconKCCWhiteLogo from 'ui/assets/chain-logos/kcc-white.svg';
import IconSongbirdLogo from 'ui/assets/chain-logos/songbird.png';
import IconSongbirdWhiteLogo from 'ui/assets/chain-logos/songbird-white.svg';
import IconEvmosLogo from 'ui/assets/chain-logos/evmos.svg';
import IconEvmosWhiteLogo from 'ui/assets/chain-logos/evmos-white.svg';
import IconDFKLogo from 'ui/assets/chain-logos/dfk.svg';
import iconDFKWhiteLogo from 'ui/assets/chain-logos/dfk-white.svg';
import IconTelosLogo from 'ui/assets/chain-logos/telos.svg';
import IconTelosWhiteLogo from 'ui/assets/chain-logos/telos-white.svg';
import IconSwmLogo from 'ui/assets/chain-logos/swimmer.svg';
import IconSwmWhiteLogo from 'ui/assets/chain-logos/swimmer-white.svg';
import IconEN from 'ui/assets/langs/en.svg';
import IconAmber from 'ui/assets/walletlogo/amber.png';
import IconBitBox02 from 'ui/assets/walletlogo/bitbox02.png';
import IconBitBox02WithBorder from 'ui/assets/walletlogo/bitbox02.png';
import IconFireblocks from 'ui/assets/walletlogo/fireblocks.png';
import IconFireblocksWithBorder from 'ui/assets/walletlogo/fireblocks-border.png';
import IconCobo from 'ui/assets/walletlogo/cobo.png';
import IconImtoken from 'ui/assets/walletlogo/imtoken.png';
import IconJade from 'ui/assets/walletlogo/jade.png';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import IconMath from 'ui/assets/walletlogo/math.png';
import IconOnekey from 'ui/assets/walletlogo/onekey.png';
import IconOneKey18 from 'ui/assets/walletlogo/onekey18.png';
import IconTokenpocket from 'ui/assets/walletlogo/tp.png';
import IconTrezor from 'ui/assets/walletlogo/trezor.png';
import IconMetaMask from 'ui/assets/walletlogo/metamask.svg';
import IconTrust from 'ui/assets/walletlogo/trust.png';
import IconMnemonicInk from 'ui/assets/walletlogo/mnemonic-ink.svg';
import IconPrivateKeyInk from 'ui/assets/walletlogo/privatekey-ink.svg';
import IconWatchPurple from 'ui/assets/walletlogo/watch-purple.svg';
import IconTrezor24 from 'ui/assets/walletlogo/trezor24.png';
import IconTrezor24Border from 'ui/assets/walletlogo/trezor24-border.png';
import LogoTrust from 'ui/assets/walletlogo/TrustWalletLogo.png';
import LogoTp from 'ui/assets/walletlogo/TokenPocketLogo.png';
import LogoMath from 'ui/assets/walletlogo/MathWalletLogo.png';
import LogoJade from 'ui/assets/walletlogo/JadeLogo.png';
import LogoImtoken from 'ui/assets/walletlogo/imTokenLogo.png';
import LogoCobo from 'ui/assets/walletlogo/CoboLogo.png';
import LogoAmber from 'ui/assets/walletlogo/AmberLogo.png';
import LogoOnekey from 'ui/assets/walletlogo/onekey28.png';
import LogoTrezor from 'ui/assets/walletlogo/Trezor28.png';
import LogoMnemonic from 'ui/assets/walletlogo/mnemoniclogo.svg';
import LogoPrivateKey from 'ui/assets/walletlogo/privatekeylogo.svg';
import LogoWatch from 'ui/assets/walletlogo/watchlogo.svg';
import IconPrivateKeyWhite from 'ui/assets/walletlogo/private-key-white.svg';
import IconWatchWhite from 'ui/assets/walletlogo/IconWatch-white.svg';
import IconMnemonicWhite from 'ui/assets/walletlogo/IconMnemonic-white.svg';
import LogoLedgerDark from 'ui/assets/walletlogo/ledgerdark.png';
import LogoLedgerWhite from 'ui/assets/walletlogo/ledgerwhite.png';
import IconGridPlus from 'ui/assets/walletlogo/gridplus.png';
import LogoKeystone from 'ui/assets/walletlogo/keystone.png';

export enum CHAINS_ENUM {
  ETH = 'ETH',
  BSC = 'BSC',
  GNOSIS = 'GNOSIS',
  HECO = 'HECO',
  POLYGON = 'POLYGON',
  FTM = 'FTM',
  OKT = 'OKT',
  ARBITRUM = 'ARBITRUM',
  AVAX = 'AVAX',
  OP = 'OP',
  CELO = 'CELO',
  MOVR = 'MOVR',
  CRO = 'CRO',
  BOBA = 'BOBA',
  METIS = 'METIS',
  OASIS = 'OASIS',
  BTT = 'BTT',
  AURORA = 'AURORA',
  MOBM = 'MOBM',
  SBCH = 'SBCH',
  FUSE = 'FUSE',
  HMY = 'HMY',
  PALM = 'PALM',
  ASTAR = 'ASTAR',
  SDN = 'SDN',
  KLAY = 'KLAY',
  IOTX = 'IOTX',
  RSK = 'RSK',
  WAN = 'WAN',
  KCC = 'KCC',
  SGB = 'SGB',
  EVMOS = 'EVMOS',
  DFK = 'DFK',
  TLOS = 'TLOS',
  SWM = 'SWM',
}

export const CHAINS: Record<string, Chain> = {
  [CHAINS_ENUM.ETH]: {
    id: 1,
    serverId: 'eth',
    name: 'Ethereum',
    hex: '0x1',
    enum: CHAINS_ENUM.ETH,
    logo: IconEthLogo,
    whiteLogo: IconEthWhiteLogo,
    network: '1',
    nativeTokenSymbol: 'ETH',
    nativeTokenLogo:
      'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
    nativeTokenDecimals: 18,
    nativeTokenAddress: 'eth',
    scanLink: 'https://etherscan.io/tx/_s_',
    thridPartyRPC:
      'https://eth-mainnet.alchemyapi.io/v2/hVcflvG3Hp3ufTgyfj-s9govLX5OYluf',
    eip: {
      '1559': true,
    },
  },
  [CHAINS_ENUM.BSC]: {
    id: 56,
    name: 'BSC',
    serverId: 'bsc',
    hex: '0x38',
    enum: CHAINS_ENUM.BSC,
    logo: IconBscLogo,
    whiteLogo: IconBscWhiteLogo,
    network: '56',
    nativeTokenSymbol: 'BNB',
    nativeTokenAddress: 'bsc',
    scanLink: 'https://bscscan.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/bsc_token/logo_url/bsc/8bfdeaa46fe9be8f5cd43a53b8d1eea1.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://bsc-dataseed1.binance.org',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.GNOSIS]: {
    id: 100,
    name: 'Gnosis',
    serverId: 'xdai',
    hex: '0x64',
    enum: CHAINS_ENUM.GNOSIS,
    logo: IconDaiLogo,
    whiteLogo: IconDaiWhiteLogo,
    network: '100',
    nativeTokenSymbol: 'xDai',
    nativeTokenAddress: 'xdai',
    scanLink: 'https://blockscout.com/xdai/mainnet/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/xdai_token/logo_url/xdai/1207e67652b691ef3bfe04f89f4b5362.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc.xdaichain.com',
    eip: {
      '1559': true,
    },
  },
  [CHAINS_ENUM.POLYGON]: {
    id: 137,
    serverId: 'matic',
    name: 'Polygon',
    hex: '0x89',
    enum: CHAINS_ENUM.POLYGON,
    logo: IconPolygonLogo,
    whiteLogo: IconPolygonWhiteLogo,
    network: '137',
    nativeTokenSymbol: 'MATIC',
    nativeTokenAddress: 'matic',
    nativeTokenDecimals: 18,
    scanLink: 'https://polygonscan.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/matic_token/logo_url/matic/e5a8a2860ba5cf740a474dcab796dc63.png',
    thridPartyRPC: 'https://polygon-rpc.com',
    eip: {
      '1559': true,
    },
  },
  [CHAINS_ENUM.FTM]: {
    id: 250,
    serverId: 'ftm',
    name: 'Fantom',
    hex: '0xfa',
    enum: CHAINS_ENUM.FTM,
    logo: IconFantom,
    whiteLogo: IconFantomWhiteLogo,
    network: '250',
    nativeTokenSymbol: 'FTM',
    nativeTokenAddress: 'ftm',
    scanLink: 'https://ftmscan.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc.ftm.tools',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.OKT]: {
    id: 66,
    serverId: 'okt',
    name: 'OKC',
    enum: CHAINS_ENUM.OKT,
    logo: IconOKTLogo,
    whiteLogo: IconOKTWhiteLogo,
    hex: '0x42',
    network: '66',
    nativeTokenSymbol: 'OKT',
    nativeTokenAddress: 'okt',
    scanLink: 'https://www.oklink.com/okexchain/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/ftm_token/logo_url/ftm/33fdb9c5067e94f3a1b9e78f6fa86984.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://exchainrpc.okex.org',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.HECO]: {
    id: 128,
    serverId: 'heco',
    name: 'HECO',
    enum: CHAINS_ENUM.HECO,
    logo: IconHecoLogo,
    whiteLogo: IconHecoWhiteLogo,
    hex: '0x80',
    network: '128',
    nativeTokenSymbol: 'HT',
    nativeTokenAddress: 'heco',
    scanLink: 'https://hecoinfo.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/heco_token/logo_url/heco/c399dcddde07e1944c4dd8f922832b53.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://http-mainnet.hecochain.com',
    eip: {
      '1559': true,
    },
  },
  // https://developer.offchainlabs.com/docs/public_testnet#connection-information
  [CHAINS_ENUM.ARBITRUM]: {
    id: 42161,
    serverId: 'arb',
    name: 'Arbitrum',
    enum: CHAINS_ENUM.ARBITRUM,
    logo: IconArbitrumLogo,
    whiteLogo: IconArbitrumWhiteLogo,
    hex: '0xa4b1',
    network: '42161',
    nativeTokenSymbol: 'ETH',
    nativeTokenAddress: 'arb',
    scanLink: 'https://arbiscan.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/arb_token/logo_url/arb/d61441782d4a08a7479d54aea211679e.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://arb1.arbitrum.io/rpc',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.AVAX]: {
    id: 43114,
    serverId: 'avax',
    network: '43114',
    name: 'Avalanche',
    nativeTokenSymbol: 'AVAX',
    nativeTokenAddress: 'avax',
    enum: CHAINS_ENUM.AVAX,
    logo: IconAvaxLogo,
    whiteLogo: IconAvaxWhiteLogo,
    hex: '0xa86a',
    scanLink: 'https://snowtrace.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/avax_token/logo_url/avax/0b9c84359c84d6bdd5bfda9c2d4c4a82.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://api.avax.network/ext/bc/C/rpc',
    eip: {
      '1559': true,
    },
  },
  [CHAINS_ENUM.OASIS]: {
    id: 42262,
    serverId: 'rose',
    network: '42262',
    name: 'Oasis',
    nativeTokenSymbol: 'ROSE',
    nativeTokenAddress: 'rose',
    enum: CHAINS_ENUM.OASIS,
    logo: IconRoseLogo,
    whiteLogo: IconRoseWhiteLogo,
    hex: '0xa516',
    scanLink: 'https://snowtrace.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/eth_nft/local_url/dc7b906c0339dba8edf5618663400eb7/92e27fe3ad418bbd166836ab8de85603.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://emerald.oasis.dev',
    eip: {
      '1559': true,
    },
  },
  [CHAINS_ENUM.OP]: {
    id: 10,
    serverId: 'op',
    network: '10',
    name: 'Optimism',
    enum: CHAINS_ENUM.OP,
    logo: IconOPLogo,
    whiteLogo: IconOPWhiteLogo,
    hex: '0xa',
    scanLink: 'https://optimistic.etherscan.io/tx/_s_',
    nativeTokenSymbol: 'ETH',
    nativeTokenAddress: 'op',
    nativeTokenLogo:
      'https://static.debank.com/image/op_token/logo_url/op/d61441782d4a08a7479d54aea211679e.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://mainnet.optimism.io',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.CELO]: {
    id: 42220,
    serverId: 'celo',
    network: '42220',
    name: 'Celo',
    nativeTokenSymbol: 'CELO',
    nativeTokenAddress: '0x471ece3750da237f93b8e339c536989b8978a438',
    enum: CHAINS_ENUM.CELO,
    logo: IconCeloLogo,
    whiteLogo: IconCeloWhiteLogo,
    hex: '0xa4ec',
    scanLink: 'https://explorer.celo.org/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/celo_token/logo_url/0x471ece3750da237f93b8e339c536989b8978a438/6f524d91db674876ba0f5767cf0124cc.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://forno.celo.org',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.MOVR]: {
    id: 1285,
    serverId: 'movr',
    network: '1285',
    name: 'Moonriver',
    nativeTokenSymbol: 'MOVR',
    nativeTokenAddress: 'movr',
    enum: CHAINS_ENUM.MOVR,
    logo: IconMoonriverLogo,
    whiteLogo: IconMoonriverWhiteLogo,
    hex: '0x505',
    scanLink: 'https://moonriver.moonscan.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/movr/c66f89fdceaea8d8fce263a1f816d671.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc.moonriver.moonbeam.network',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.CRO]: {
    id: 25,
    serverId: 'cro',
    network: '25',
    name: 'Cronos',
    nativeTokenSymbol: 'CRO',
    nativeTokenAddress: 'cro',
    enum: CHAINS_ENUM.CRO,
    logo: IconCronosLogo,
    whiteLogo: IconCronosWhiteLogo,
    hex: '0x19',
    scanLink: 'https://cronoscan.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/cro/affddd53019ffb9dbad0c724e12500c0.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://evm-cronos.crypto.org',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.BOBA]: {
    id: 288,
    serverId: 'boba',
    network: '288',
    name: 'Boba',
    nativeTokenSymbol: 'ETH',
    nativeTokenAddress: 'boba',
    enum: CHAINS_ENUM.BOBA,
    logo: IconBobaLogo,
    whiteLogo: IconBobaWhiteLogo,
    hex: '0x120',
    scanLink: 'https://blockexplorer.boba.network/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/op_token/logo_url/0x4200000000000000000000000000000000000006/d61441782d4a08a7479d54aea211679e.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://mainnet.boba.network/',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.METIS]: {
    id: 1088,
    serverId: 'metis',
    network: '1088',
    name: 'Metis',
    nativeTokenSymbol: 'Metis',
    nativeTokenAddress: 'metis',
    enum: CHAINS_ENUM.METIS,
    logo: IconMetisLogo,
    whiteLogo: IconMetisWhiteLogo,
    hex: '0x440',
    scanLink: 'https://andromeda-explorer.metis.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/metis/b289da32db4d860ebf6fb46a6e41dcfc.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://andromeda.metis.io/?owner=1088',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.BTT]: {
    id: 199,
    serverId: 'btt',
    network: '199',
    name: 'BTTC',
    nativeTokenSymbol: 'BTT',
    nativeTokenAddress: 'btt',
    enum: CHAINS_ENUM.BTT,
    logo: IconBttLogo,
    whiteLogo: IconBttWhiteLogo,
    hex: '0xc7',
    scanLink: 'https://bttcscan.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/btt/2130a8d57ff2a0f3d50a4ec9432897c6.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc.bittorrentchain.io/',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.AURORA]: {
    id: 1313161554,
    serverId: 'aurora',
    network: '1313161554',
    name: 'Aurora',
    nativeTokenSymbol: 'AETH',
    nativeTokenAddress: 'aurora',
    enum: CHAINS_ENUM.AURORA,
    logo: IconAuroraLogo,
    whiteLogo: IconAuroraWhiteLogo,
    hex: '0x4e454152',
    scanLink: 'https://aurorascan.dev/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://mainnet.aurora.dev',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.MOBM]: {
    id: 1284,
    serverId: 'mobm',
    network: '1284',
    name: 'Moonbeam',
    nativeTokenSymbol: 'GLMR',
    nativeTokenAddress: 'mobm',
    enum: CHAINS_ENUM.MOBM,
    logo: IconMobmLogo,
    whiteLogo: IconMobmWhiteLogo,
    hex: '0x504',
    scanLink: 'https://moonscan.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/mobm_token/logo_url/mobm/a8442077d76b258297181c3e6eb8c9cc.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://blockscout.moonbeam.network/api/eth-rpc',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.SBCH]: {
    id: 10000,
    serverId: 'sbch',
    network: '10000',
    name: 'smartBCH',
    nativeTokenSymbol: 'BCH',
    nativeTokenAddress: 'sbch',
    enum: CHAINS_ENUM.SBCH,
    logo: IconSbchLogo,
    whiteLogo: IconSbchWhiteLogo,
    hex: '0x2710',
    scanLink: 'https://www.smartscan.cash/transaction/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/sbch_token/logo_url/sbch/03007b5353bb9e221efb82a6a70d9ec9.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc-mainnet.smartbch.org',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.FUSE]: {
    id: 122,
    serverId: 'fuse',
    network: '122',
    name: 'Fuse',
    nativeTokenSymbol: 'FUSE',
    nativeTokenAddress: 'fuse',
    enum: CHAINS_ENUM.FUSE,
    logo: IconFuseLogo,
    whiteLogo: IconFuseWhiteLogo,
    hex: '0x7a',
    scanLink: 'https://explorer.fuse.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/fuse/ea4c9e12e7f646d42aa8fb07ab8dfec8.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc.fuse.io',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.HMY]: {
    id: 1666600000,
    serverId: 'hmy',
    network: '1666600000',
    name: 'Harmony',
    nativeTokenSymbol: 'ONE',
    nativeTokenAddress: 'hmy',
    enum: CHAINS_ENUM.HMY,
    logo: IconHarmonyLogo,
    whiteLogo: IconHarmonyWhiteLogo,
    hex: '0x63564c40',
    scanLink: 'https://explorer.harmony.one/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/hmy/734c003023531e31c636ae25d5a73172.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://a.api.s0.t.hmny.io',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.PALM]: {
    id: 11297108109,
    serverId: 'palm',
    network: '11297108109',
    name: 'Palm',
    nativeTokenSymbol: 'PALM',
    nativeTokenAddress: 'palm',
    enum: CHAINS_ENUM.PALM,
    logo: IconPalmLogo,
    whiteLogo: IconPalmWhiteLogo,
    hex: '0x2a15c308d',
    scanLink: 'https://explorer.palm.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/palm/45160297f72604eef509ebb3d0d468e7.png',
    nativeTokenDecimals: 18,
    thridPartyRPC:
      'https://palm-mainnet.infura.io/v3/da5fbfafcca14b109e2665290681e267',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.ASTAR]: {
    id: 592,
    serverId: 'astar',
    network: '592',
    name: 'Astar',
    nativeTokenSymbol: 'ASTR',
    nativeTokenAddress: 'astar',
    enum: CHAINS_ENUM.ASTAR,
    logo: IconAstarLogo,
    whiteLogo: IconAstarWhiteLogo,
    hex: '0x250',
    scanLink: 'https://blockscout.com/astar/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/astar/a827be92d88617a918ea060a9a6f1572.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc.astar.network:8545',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.SDN]: {
    id: 336,
    serverId: 'sdn',
    network: '336',
    name: 'Shiden',
    nativeTokenSymbol: 'SDN',
    nativeTokenAddress: 'sdn',
    enum: CHAINS_ENUM.SDN,
    logo: IconShidenLogo,
    whiteLogo: IconShidenWhiteLogo,
    hex: '0x150',
    scanLink: 'https://blockscout.com/shiden/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/sdn/9b5bcaa0d5f102548f925e968a5e7a25.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://evm.shiden.astar.network',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.KLAY]: {
    id: 8217,
    serverId: 'klay',
    network: '8217',
    name: 'Klaytn',
    nativeTokenSymbol: 'KLAY',
    nativeTokenAddress: 'klay',
    enum: CHAINS_ENUM.KLAY,
    logo: IconKlaytnLogo,
    whiteLogo: IconKlaytnWhiteLogo,
    hex: '0x2019',
    scanLink: 'https://scope.klaytn.com/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/klay/1df018b8493cb97c50b7e390ef63cba4.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://public-node-api.klaytnapi.com/v1/cypress',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.IOTX]: {
    id: 4689,
    serverId: 'iotx',
    network: '4689',
    name: 'IoTeX',
    nativeTokenSymbol: 'IOTX',
    nativeTokenAddress: 'iotx',
    enum: CHAINS_ENUM.IOTX,
    logo: IconIotxLogo,
    whiteLogo: IconIotxWhiteLogo,
    hex: '0x1251',
    scanLink: 'https://iotexscan.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/iotx/d3be2cd8677f86bd9ab7d5f3701afcc9.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://babel-api.mainnet.iotex.io',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.RSK]: {
    id: 30,
    serverId: 'rsk',
    network: '30',
    name: 'RSK',
    nativeTokenSymbol: 'RBTC',
    nativeTokenAddress: 'rsk',
    enum: CHAINS_ENUM.RSK,
    logo: IconRSKLogo,
    whiteLogo: IconRSKWhiteLogo,
    hex: '0x1e',
    scanLink: 'https://explorer.rsk.co/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/rsk/2958b02ef823097b70fac99f39889e2e.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://public-node.rsk.co',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.WAN]: {
    id: 888,
    serverId: 'wan',
    network: '888',
    name: 'Wanchain',
    nativeTokenSymbol: 'WAN',
    nativeTokenAddress: 'wan',
    enum: CHAINS_ENUM.WAN,
    logo: IconWanLogo,
    whiteLogo: IconWanWhiteLogo,
    hex: '0x378',
    scanLink: 'https://www.wanscan.org/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/wan/f3aa8b31414732ea5e026e05665146e6.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://gwan-ssl.wandevs.org:56891',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.KCC]: {
    id: 321,
    serverId: 'kcc',
    network: '321',
    name: 'KCC',
    nativeTokenSymbol: 'KCS',
    nativeTokenAddress: 'kcc',
    enum: CHAINS_ENUM.KCC,
    logo: IconKCCLogo,
    whiteLogo: IconKCCWhiteLogo,
    hex: '0x141',
    scanLink: 'https://explorer.kcc.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/kcc/3a5a4ef7d5f1db1e53880d70219d75b6.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://rpc-mainnet.kcc.network',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.SGB]: {
    id: 19,
    serverId: 'sgb',
    network: '19',
    name: 'Songbird',
    nativeTokenSymbol: 'SGB',
    nativeTokenAddress: 'sgb',
    enum: CHAINS_ENUM.SGB,
    logo: IconSongbirdLogo,
    whiteLogo: IconSongbirdWhiteLogo,
    hex: '0x13',
    scanLink: 'https://songbird-explorer.flare.network/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/sgb/619f46d574d62a50bdfd9f0e2f47ddc1.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://songbird.towolabs.com/rpc',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.EVMOS]: {
    id: 9001,
    serverId: 'evmos',
    network: '9001',
    name: 'Evmos',
    nativeTokenSymbol: 'EVMOS',
    nativeTokenAddress: 'evmos',
    enum: CHAINS_ENUM.EVMOS,
    logo: IconEvmosLogo,
    whiteLogo: IconEvmosWhiteLogo,
    hex: '0x2329',
    scanLink: 'https://evm.evmos.org/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/evmos/26e038b4d5475d5a4b92f7fc08bdabc9.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://eth.bd.evmos.org:8545',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.DFK]: {
    id: 53935,
    serverId: 'dfk',
    network: '53935',
    name: 'DFK',
    nativeTokenSymbol: 'JEWEL',
    nativeTokenAddress: 'dfk',
    enum: CHAINS_ENUM.DFK,
    logo: IconDFKLogo,
    whiteLogo: iconDFKWhiteLogo,
    hex: '0xd2af',
    scanLink:
      'https://subnets.avax.network/defi-kingdoms/dfk-chain/explorer/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/dfk/233867c089c5b71be150aa56003f3f7a.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.TLOS]: {
    id: 40,
    serverId: 'tlos',
    network: '40',
    name: 'Telos',
    nativeTokenSymbol: 'TLOS',
    nativeTokenAddress: 'tlos',
    enum: CHAINS_ENUM.TLOS,
    logo: IconTelosLogo,
    whiteLogo: IconTelosWhiteLogo,
    hex: '0x28',
    scanLink: 'https://www.teloscan.io/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/telos/f9f7493def4c08ed222540bebd8ce87a.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://mainnet.telos.net/evm',
    eip: {
      '1559': false,
    },
  },
  [CHAINS_ENUM.SWM]: {
    id: 73772,
    serverId: 'swm',
    network: '73772',
    name: 'Swimmer',
    nativeTokenSymbol: 'TUS',
    nativeTokenAddress: 'swm',
    enum: CHAINS_ENUM.SWM,
    logo: IconSwmLogo,
    whiteLogo: IconSwmWhiteLogo,
    hex: '0x1202c',
    scanLink: 'https://subnets.avax.network/swimmer/mainnet/explorer/tx/_s_',
    nativeTokenLogo:
      'https://static.debank.com/image/chain/logo_url/swm/361526e901cb506ef7074c3678ce769a.png',
    nativeTokenDecimals: 18,
    thridPartyRPC: 'https://avax-cra-rpc.gateway.pokt.network',
    eip: {
      '1559': false,
    },
  },
};

export const KEYRING_TYPE = {
  HdKeyring: 'HD Key Tree',
  SimpleKeyring: 'Simple Key Pair',
  HardwareKeyring: 'hardware',
  WatchAddressKeyring: 'Watch Address',
  WalletConnectKeyring: 'WalletConnect',
  GnosisKeyring: 'Gnosis',
};

export const KEYRING_CLASS = {
  PRIVATE_KEY: 'Simple Key Pair',
  MNEMONIC: 'HD Key Tree',
  HARDWARE: {
    BITBOX02: 'BitBox02 Hardware',
    TREZOR: 'Trezor Hardware',
    LEDGER: 'Ledger Hardware',
    ONEKEY: 'Onekey Hardware',
    GRIDPLUS: 'GridPlus Hardware',
    KEYSTONE: 'QR Hardware Wallet Device',
  },
  WATCH: 'Watch Address',
  WALLETCONNECT: 'WalletConnect',
  GNOSIS: 'Gnosis',
};

export const KEYRING_WITH_INDEX = [
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.GRIDPLUS,
];

export const SUPPORT_1559_KEYRING_TYPE = [
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.GRIDPLUS,
  KEYRING_CLASS.PRIVATE_KEY,
  KEYRING_CLASS.MNEMONIC,
  KEYRING_CLASS.HARDWARE.KEYSTONE,
  KEYRING_CLASS.HARDWARE.TREZOR,
  KEYRING_CLASS.HARDWARE.ONEKEY,
];

export const KEYRING_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Created by Seed Phrase',
  [KEYRING_TYPE.SimpleKeyring]: 'Imported by Private Key',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Watch Mode',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'Imported by BitBox02',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'Imported by Ledger',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'Imported by Trezor',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'Imported by Onekey',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'Imported by GridPlus',
  [KEYRING_CLASS.GNOSIS]: 'Imported by Gnosis Safe',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'Imported by Keystone',
};
export const BRAND_ALIAN_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Seed Phrase',
  [KEYRING_TYPE.SimpleKeyring]: 'Private Key',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Watch',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'Ledger',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'Trezor',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'Onekey',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'BitBox02',
  [KEYRING_CLASS.GNOSIS]: 'Gnosis',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'GridPlus',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'Keystone',
};
export const HARDWARE_KEYRING_TYPES = {
  BitBox02: {
    type: 'BitBox02 Hardware',
    brandName: 'BitBox02',
  },
  Ledger: {
    type: 'Ledger Hardware',
    brandName: 'Ledger',
  },
  Trezor: {
    type: 'Trezor Hardware',
    brandName: 'Trezor',
  },
  Onekey: {
    type: 'Onekey Hardware',
    brandName: 'Onekey',
  },
  GridPlus: {
    type: 'GridPlus Hardware',
    brandName: 'GridPlus',
  },
  Keystone: {
    type: 'QR Hardware Wallet Device',
    brandName: 'Keystone',
  },
};

export enum TX_TYPE_ENUM {
  SEND = 1,
  APPROVE = 2,
  CANCEL_APPROVE = 3,
  CANCEL_TX = 4,
  SIGN_TX = 5,
}

export const IS_CHROME = /Chrome\//i.test(navigator.userAgent);

export const IS_FIREFOX = /Firefox\//i.test(navigator.userAgent);

export const IS_LINUX = /linux/i.test(navigator.userAgent);

let chromeVersion: number | null = null;

if (IS_CHROME) {
  const matches = navigator.userAgent.match(/Chrome\/(\d+[^.\s])/);
  if (matches && matches.length >= 2) {
    chromeVersion = Number(matches[1]);
  }
}

export const IS_AFTER_CHROME91 = IS_CHROME
  ? chromeVersion && chromeVersion >= 91
  : false;

export const GAS_LEVEL_TEXT = {
  slow: 'Standard',
  normal: 'Fast',
  fast: 'Instant',
  custom: 'Custom',
};

export const IS_WINDOWS = /windows/i.test(navigator.userAgent);

export const LANGS = [
  {
    value: 'en',
    label: 'English',
    icon: IconEN,
  },
];

export const CHECK_METAMASK_INSTALLED_URL = {
  Chrome: 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/phishing.html',
  Firefox: '',
  Brave: '',
  Edge: '',
};

export const SAFE_RPC_METHODS = [
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_coinbase',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getEncryptionPublicKey',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getProof',
  'eth_getStorageAt',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getWork',
  'eth_hashrate',
  'eth_mining',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_protocolVersion',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_uninstallFilter',
  'wallet_requestPermissions',
  'wallet_getPermissions',
  'net_version',
];

export const MINIMUM_GAS_LIMIT = 21000;

export enum WATCH_ADDRESS_CONNECT_TYPE {
  WalletConnect = 'WalletConnect',
}

export enum BRAND_WALLET_CONNECT_TYPE {
  WalletConnect = 'WalletConnect',
  BitBox02Connect = 'BitBox02Connect',
  LedgerConnect = 'LedgerConnect',
  OneKeyConnect = 'OneKeyConnect',
  TrezorConnect = 'TrezorConnect',
  GnosisConnect = 'GnosisConnect',
  GridPlusConnect = 'GridPlusConnect',
  QRCodeBase = 'QR Hardware Wallet Device',
}

export const WALLETCONNECT_STATUS_MAP = {
  PENDING: 1,
  CONNECTED: 2,
  WAITING: 3,
  SIBMITTED: 4,
  REJECTED: 5,
  FAILD: 6,
};

export const INTERNAL_REQUEST_ORIGIN = 'https://rabby.io';

export const INTERNAL_REQUEST_SESSION = {
  name: 'Rabby',
  origin: INTERNAL_REQUEST_ORIGIN,
  icon: './images/icon-128.png',
};

export const INITIAL_OPENAPI_URL = 'https://api.rabby.io';

export const EVENTS = {
  broadcastToUI: 'broadcastToUI',
  broadcastToBackground: 'broadcastToBackground',
  SIGN_FINISHED: 'SIGN_FINISHED',
  WALLETCONNECT: {
    STATUS_CHANGED: 'WALLETCONNECT_STATUS_CHANGED',
    INIT: 'WALLETCONNECT_INIT',
    INITED: 'WALLETCONNECT_INITED',
  },
  GNOSIS: {
    TX_BUILT: 'TransactionBuilt',
    TX_CONFIRMED: 'TransactionConfirmed',
  },
  QRHARDWARE: {
    ACQUIRE_MEMSTORE_SUCCEED: 'ACQUIRE_MEMSTORE_SUCCEED',
  },
  LEDGER: {
    REJECTED: 'LEDGER_REJECTED',
    REJECT_APPROVAL: 'LEDGER_REJECT_APPROVAL',
  },
};

export enum WALLET_BRAND_TYPES {
  AMBER = 'AMBER',
  BITBOX02 = 'BITBOX02',
  COBO = 'COBO',
  FIREBLOCKS = 'FIREBLOCKS',
  IMTOKEN = 'IMTOKEN',
  JADE = 'JADE',
  LEDGER = 'LEDGER',
  MATHWALLET = 'MATHWALLET',
  ONEKEY = 'ONEKEY',
  TP = 'TP',
  TREZOR = 'TREZOR',
  TRUSTWALLET = 'TRUSTWALLET',
  GNOSIS = 'Gnosis',
  GRIDPLUS = 'GRIDPLUS',
  METAMASK = 'MetaMask',
  KEYSTONE = 'Keystone',
}

enum WALLET_BRAND_CATEGORY {
  MOBILE = 'mobile',
  HARDWARE = 'hardware',
  INSTITUTIONAL = 'institutional',
}

export type IWalletBrandContent = {
  id: number;
  name: string;
  brand: WALLET_BRAND_TYPES;
  icon: string;
  image: string;
  connectType: BRAND_WALLET_CONNECT_TYPE;
  category: WALLET_BRAND_CATEGORY;
};

export const WALLET_BRAND_CONTENT: {
  [K in WALLET_BRAND_TYPES]: IWalletBrandContent;
} = {
  [WALLET_BRAND_TYPES.AMBER]: {
    id: 0,
    name: 'Amber',
    brand: WALLET_BRAND_TYPES.AMBER,
    icon: IconAmber,
    image: LogoAmber,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.BITBOX02]: {
    id: 10,
    name: 'BitBox02',
    brand: WALLET_BRAND_TYPES.BITBOX02,
    icon: IconBitBox02,
    image: IconBitBox02WithBorder,
    connectType: BRAND_WALLET_CONNECT_TYPE.BitBox02Connect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.COBO]: {
    id: 1,
    name: 'Cobo Wallet',
    brand: WALLET_BRAND_TYPES.COBO,
    icon: IconCobo,
    image: LogoCobo,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.FIREBLOCKS]: {
    id: 11,
    name: 'FireBlocks',
    brand: WALLET_BRAND_TYPES.FIREBLOCKS,
    icon: IconFireblocks,
    image: IconFireblocksWithBorder,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.GNOSIS]: {
    id: 13,
    name: 'Gnosis Safe',
    brand: WALLET_BRAND_TYPES.GNOSIS,
    icon: IconGnosis,
    image: IconGnosis,
    connectType: BRAND_WALLET_CONNECT_TYPE.GnosisConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.GRIDPLUS]: {
    id: 12,
    name: 'GridPlus',
    brand: WALLET_BRAND_TYPES.GRIDPLUS,
    icon: IconGridPlus,
    image: IconGridPlus,
    connectType: BRAND_WALLET_CONNECT_TYPE.GridPlusConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.IMTOKEN]: {
    id: 2,
    name: 'imToken',
    brand: WALLET_BRAND_TYPES.IMTOKEN,
    icon: IconImtoken,
    image: LogoImtoken,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.JADE]: {
    id: 3,
    name: 'Jade Wallet',
    brand: WALLET_BRAND_TYPES.JADE,
    icon: IconJade,
    image: LogoJade,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.KEYSTONE]: {
    id: 15,
    name: 'Keystone',
    brand: WALLET_BRAND_TYPES.KEYSTONE,
    icon: LogoKeystone,
    image: LogoKeystone,
    connectType: BRAND_WALLET_CONNECT_TYPE.QRCodeBase,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.LEDGER]: {
    id: 4,
    name: 'Ledger',
    brand: WALLET_BRAND_TYPES.LEDGER,
    icon: LogoLedgerWhite,
    image: LogoLedgerDark,
    connectType: BRAND_WALLET_CONNECT_TYPE.LedgerConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.MATHWALLET]: {
    id: 5,
    name: 'Math Wallet',
    brand: WALLET_BRAND_TYPES.MATHWALLET,
    icon: IconMath,
    image: LogoMath,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.METAMASK]: {
    id: 14,
    name: 'MetaMask Mobile',
    brand: WALLET_BRAND_TYPES.METAMASK,
    icon: IconMetaMask,
    image: IconMetaMask,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.ONEKEY]: {
    id: 6,
    name: 'OneKey',
    brand: WALLET_BRAND_TYPES.ONEKEY,
    icon: IconOnekey,
    image: LogoOnekey,
    connectType: BRAND_WALLET_CONNECT_TYPE.OneKeyConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.TP]: {
    id: 7,
    name: 'TokenPocket',
    brand: WALLET_BRAND_TYPES.TP,
    icon: IconTokenpocket,
    image: LogoTp,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.TREZOR]: {
    id: 8,
    name: 'Trezor',
    brand: WALLET_BRAND_TYPES.TREZOR,
    icon: IconTrezor,
    image: LogoTrezor,
    connectType: BRAND_WALLET_CONNECT_TYPE.TrezorConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.TRUSTWALLET]: {
    id: 9,
    name: 'Trust Wallet',
    brand: WALLET_BRAND_TYPES.TRUSTWALLET,
    icon: IconTrust,
    image: LogoTrust,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
};

export const KEYRING_ICONS = {
  [KEYRING_CLASS.MNEMONIC]: IconMnemonicInk,
  [KEYRING_CLASS.PRIVATE_KEY]: IconPrivateKeyInk,
  [KEYRING_CLASS.WATCH]: IconWatchPurple,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: IconBitBox02,
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LogoLedgerWhite,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: LogoOnekey,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: IconTrezor24,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: IconGridPlus,
  [HARDWARE_KEYRING_TYPES.Keystone.type]: LogoKeystone,
};

export const KEYRING_ICONS_WHITE = {
  [KEYRING_CLASS.MNEMONIC]: IconMnemonicWhite,
  [KEYRING_CLASS.PRIVATE_KEY]: IconPrivateKeyWhite,
  [KEYRING_CLASS.WATCH]: IconWatchWhite,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: IconBitBox02,
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LogoLedgerWhite,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: LogoOnekey,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: IconTrezor24,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: IconGridPlus,
  [HARDWARE_KEYRING_TYPES.Keystone.type]: LogoKeystone,
};
export const KEYRING_PURPLE_LOGOS = {
  [KEYRING_CLASS.MNEMONIC]: IconMnemonicInk,
  [KEYRING_CLASS.PRIVATE_KEY]: IconPrivateKeyInk,
  [KEYRING_CLASS.WATCH]: IconWatchPurple,
};

export const KEYRINGS_LOGOS = {
  [KEYRING_CLASS.MNEMONIC]: LogoMnemonic,
  [KEYRING_CLASS.PRIVATE_KEY]: LogoPrivateKey,
  [KEYRING_CLASS.WATCH]: LogoWatch,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: IconBitBox02WithBorder,
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LogoLedgerWhite,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: IconOneKey18,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: IconTrezor24Border,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: IconGridPlus,
  [HARDWARE_KEYRING_TYPES.Keystone.type]: LogoKeystone,
};

export const NOT_CLOSE_UNFOCUS_LIST: string[] = [
  WALLET_BRAND_TYPES.AMBER,
  WALLET_BRAND_TYPES.COBO,
];

export const SPECIFIC_TEXT_BRAND = {
  [WALLET_BRAND_TYPES.JADE]: {
    i18nKey: 'WatchGuideStep2JADE',
  },
};

export const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WalletConnectKeyring]: 4,
  [KEYRING_TYPE.WatchAddressKeyring]: 5,
};

export const GASPRICE_RANGE = {
  [CHAINS_ENUM.ETH]: [0, 10000],
  [CHAINS_ENUM.BOBA]: [0, 1000],
  [CHAINS_ENUM.OP]: [0, 1000],
  [CHAINS_ENUM.ARBITRUM]: [0, 1000],
  [CHAINS_ENUM.AURORA]: [0, 1000],
  [CHAINS_ENUM.BSC]: [0, 1000],
  [CHAINS_ENUM.AVAX]: [0, 4000],
  [CHAINS_ENUM.POLYGON]: [0, 250000],
  [CHAINS_ENUM.FTM]: [0, 360000],
  [CHAINS_ENUM.GNOSIS]: [0, 500000],
  [CHAINS_ENUM.OKT]: [0, 15000],
  [CHAINS_ENUM.HECO]: [0, 50000],
  [CHAINS_ENUM.CELO]: [0, 100000],
  [CHAINS_ENUM.MOVR]: [0, 3000],
  [CHAINS_ENUM.CRO]: [0, 100000],
  [CHAINS_ENUM.BTT]: [0, 20000000000],
  [CHAINS_ENUM.METIS]: [0, 3000],
};

export const HDPaths = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: [
    { name: 'Ledger Live', value: "m/44'/60'/0'/0/0" },
    { name: 'Legacy (MEW / MyCrypto)', value: "m/44'/60'/0'" },
    { name: 'BIP44 Standard', value: "m/44'/60'/0'/0" },
  ],
};

export enum KEYRING_CATEGORY {
  Mnemonic = 'Mnemonic',
  PrivateKey = 'PrivateKey',
  WatchMode = 'WatchMode',
  Contract = 'Contract',
  Hardware = 'Hardware',
  WalletConnect = 'WalletConnect',
}

export const KEYRING_CATEGORY_MAP = {
  [KEYRING_CLASS.MNEMONIC]: KEYRING_CATEGORY.Mnemonic,
  [KEYRING_CLASS.PRIVATE_KEY]: KEYRING_CATEGORY.PrivateKey,
  [KEYRING_CLASS.WATCH]: KEYRING_CATEGORY.WatchMode,
  [KEYRING_CLASS.HARDWARE.LEDGER]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.TREZOR]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.BITBOX02]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.WALLETCONNECT]: KEYRING_CATEGORY.WalletConnect,
  [KEYRING_CLASS.GNOSIS]: KEYRING_CATEGORY.Contract,
};
