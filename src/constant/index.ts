import { CHAINS, CHAINS_ENUM, Chain } from '@debank/common';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import IconAmber, {
  ReactComponent as RcIconAmber,
} from 'ui/assets/walletlogo/amber.svg';
import LogoAmber, {
  ReactComponent as RcLogoAmber,
} from 'ui/assets/walletlogo/amber.svg';
import {
  default as IconBitBox02,
  ReactComponent as RcIconBitBox02,
  default as IconBitBox02WithBorder,
  ReactComponent as RcIconBitBox02WithBorder,
} from 'ui/assets/walletlogo/bitbox.svg';
import IconCobo, {
  ReactComponent as RcIconCobo,
} from 'ui/assets/walletlogo/cobo.svg';
import LogoCobo, {
  ReactComponent as RcLogoCobo,
} from 'ui/assets/walletlogo/cobo.svg';
import IconFireblocksWithBorder, {
  ReactComponent as RcIconFireblocksWithBorder,
} from 'ui/assets/walletlogo/fireblocks.svg';
import IconFireblocks, {
  ReactComponent as RcIconFireblocks,
} from 'ui/assets/walletlogo/fireblocks.svg';
import IconGnosis, {
  ReactComponent as RcIconGnosis,
} from 'ui/assets/walletlogo/safe.svg';
import IconGridPlus, {
  ReactComponent as RcIconGridPlus,
} from 'ui/assets/walletlogo/gridplus.svg';
import IconImtoken, {
  ReactComponent as RcIconImtoken,
} from 'ui/assets/walletlogo/imtoken.svg';
import LogoImtoken, {
  ReactComponent as RcLogoImtoken,
} from 'ui/assets/walletlogo/imtoken.svg';
import IconJade, {
  ReactComponent as RcIconJade,
} from 'ui/assets/walletlogo/jade.svg';
import LogoJade, {
  ReactComponent as RcLogoJade,
} from 'ui/assets/walletlogo/jade.svg';
import LogoKeystone, {
  ReactComponent as RcLogoKeystone,
} from 'ui/assets/walletlogo/keystone.svg';
import LogoAirGap, {
  ReactComponent as RcLogoAirGap,
} from 'ui/assets/walletlogo/airgap.svg';
import LogoLedgerDark, {
  ReactComponent as RcLogoLedgerDark,
} from 'ui/assets/walletlogo/ledger.svg';
import LogoLedgerWhite, {
  ReactComponent as RcLogoLedgerWhite,
} from 'ui/assets/walletlogo/ledger.svg';
import IconMath, {
  ReactComponent as RcIconMath,
} from 'ui/assets/walletlogo/math.svg';
import LogoMath, {
  ReactComponent as RcLogoMath,
} from 'ui/assets/walletlogo/math.svg';
import IconMetaMask, {
  ReactComponent as RcIconMetaMask,
} from 'ui/assets/walletlogo/metamask.svg';
import IconMnemonicInk, {
  ReactComponent as RcIconMnemonicInk,
} from 'ui/assets/walletlogo/mnemonic-ink.svg';
import IconMnemonicWhite, {
  ReactComponent as RcIconMnemonicWhite,
} from 'ui/assets/walletlogo/IconMnemonic-white.svg';
import IconOnekey, {
  ReactComponent as RcIconOnekey,
} from 'ui/assets/walletlogo/onekey.svg';
import IconOneKey18, {
  ReactComponent as RcIconOneKey18,
} from 'ui/assets/walletlogo/onekey.svg';
import LogoOnekey, {
  ReactComponent as RcLogoOnekey,
} from 'ui/assets/walletlogo/onekey.svg';
import IconPrivateKeyWhite, {
  ReactComponent as RcIconPrivateKeyWhite,
} from 'ui/assets/walletlogo/private-key-white.svg';
import IconPrivateKeyInk, {
  ReactComponent as RcIconPrivateKeyInk,
} from 'ui/assets/walletlogo/privatekey-ink.svg';
import LogoPrivateKey, {
  ReactComponent as RcLogoPrivateKey,
} from 'ui/assets/walletlogo/privatekeylogo.svg';
import LogoTp, {
  ReactComponent as RcLogoTp,
} from 'ui/assets/walletlogo/tp.svg';
import IconTokenpocket, {
  ReactComponent as RcIconTokenpocket,
} from 'ui/assets/walletlogo/tp.svg';
import IconTrezor, {
  ReactComponent as RcIconTrezor,
} from 'ui/assets/walletlogo/trezor.svg';
import IconTrezor24Border, {
  ReactComponent as RcIconTrezor24Border,
} from 'ui/assets/walletlogo/trezor.svg';
import IconTrezor24, {
  ReactComponent as RcIconTrezor24,
} from 'ui/assets/walletlogo/trezor.svg';
import LogoTrezor, {
  ReactComponent as RcLogoTrezor,
} from 'ui/assets/walletlogo/trezor.svg';
import LogoTrust, {
  ReactComponent as RcLogoTrust,
} from 'ui/assets/walletlogo/trust.svg';
import IconTrust, {
  ReactComponent as RcIconTrust,
} from 'ui/assets/walletlogo/trust.svg';
import LogoCoolWallet, {
  ReactComponent as RcLogoCoolWallet,
} from 'ui/assets/walletlogo/coolwallet.svg';
import IconWatchPurple, {
  ReactComponent as RcIconWatchPurple,
} from 'ui/assets/walletlogo/watch-purple.svg';
import IconWatchWhite, {
  ReactComponent as RcIconWatchWhite,
} from 'ui/assets/walletlogo/IconWatch-white.svg';
import LogoDefiant, {
  ReactComponent as RcLogoDefiant,
} from 'ui/assets/walletlogo/defiant.svg';
import LogoDefiantWhite, {
  ReactComponent as RcLogoDefiantWhite,
} from 'ui/assets/walletlogo/defiant.svg';
import IconSafe, {
  ReactComponent as RcIconSafe,
} from 'ui/assets/sign/security-engine/safe.svg';
import IconDanger, {
  ReactComponent as RcIconDanger,
} from 'ui/assets/sign/security-engine/danger.svg';
import IconForbidden, {
  ReactComponent as RcIconForbidden,
} from 'ui/assets/sign/security-engine/forbidden.svg';
import IconWarning, {
  ReactComponent as RcIconWarning,
} from 'ui/assets/sign/security-engine/warning.svg';
import IconError, {
  ReactComponent as RcIconError,
} from 'ui/assets/sign/security-engine/error.svg';
import IconProceed, {
  ReactComponent as RcIconProceed,
} from 'ui/assets/sign/security-engine/processed.svg';
import IconClosed, {
  ReactComponent as RcIconClosed,
} from 'ui/assets/sign/security-engine/closed.svg';
import LogoWalletConnect, {
  ReactComponent as RcLogoWalletConnect,
} from 'ui/assets/walletlogo/walletconnect.svg';
import LogoWalletConnectWhite, {
  ReactComponent as RcLogoWalletConnectWhite,
} from 'ui/assets/walletlogo/walletconnect.svg';
import LogoBitkeep, {
  ReactComponent as RcLogoBitkeep,
} from 'ui/assets/walletlogo/bitkeep.svg';
import LogoRainbow, {
  ReactComponent as RcLogoRainbow,
} from 'ui/assets/walletlogo/rainbow.svg';
import LogoMPCVault, {
  ReactComponent as RcLogoMPCVault,
} from 'ui/assets/walletlogo/mpcvault.svg';
import LogoImtokenOffline, {
  ReactComponent as RcLogoImtokenOffline,
} from 'ui/assets/walletlogo/imTokenOffline.svg';
import LogoZerion, {
  ReactComponent as RcLogoZerion,
} from 'ui/assets/walletlogo/zerion.svg';
import LogoCoboArgus, {
  ReactComponent as RcLogoCoboArgus,
} from 'ui/assets/walletlogo/CoboArgus.svg';
import IconCoinbase, {
  ReactComponent as RCIconCoinbase,
} from 'ui/assets/walletlogo/coinbase.svg';
import IconImKey, {
  ReactComponent as RCIconImKey,
} from 'ui/assets/walletlogo/imkey.svg';
import IconUtila, {
  ReactComponent as RCIconUtila,
} from 'ui/assets/walletlogo/utila.svg';
import {
  ensureChainHashValid,
  ensureChainListValid,
  getChainList,
  getMainnetChainList,
} from '@/utils/chain';
import { DEX_ENUM, DEX_SUPPORT_CHAINS } from '@rabby-wallet/rabby-swap';
import browser from 'webextension-polyfill';

import LogoParaswap from 'ui/assets/swap/paraswap.png';
import Logo0X from 'ui/assets/swap/0xswap.png';
import Logo1inch from 'ui/assets/swap/1inch.png';

import LogoOpenOcean from 'ui/assets/swap/openocean.png';
import LogoBinance from 'ui/assets/swap/binance.png';
import LogoCoinbase from 'ui/assets/swap/coinbase.png';
import LogoOkx from 'ui/assets/swap/okx.png';
import LogoTokenDefault from 'ui/assets/token-default.svg';
import LogoKyberSwap from 'ui/assets/swap/kyberswap.png';
import RabbyChainLogo from '@/ui/assets/rabby-chain-logo.png';

export { default as LANGS } from '../../_raw/locales/index.json';

export { CHAINS, CHAINS_ENUM };

interface PortfolioChain extends Chain {
  isSupportHistory: boolean;
}

export const CHAIN_ID_LIST = new Map<string, PortfolioChain>(
  getChainList('mainnet').map((chain) => {
    return [chain.serverId, { ...chain, isSupportHistory: false }];
  })
);

export const syncChainIdList = () => {
  const chainList = getChainList('mainnet');
  for (const chain of chainList) {
    if (!CHAIN_ID_LIST.has(chain.serverId)) {
      CHAIN_ID_LIST.set(chain.serverId, {
        ...chain,
        isSupportHistory: false,
      });
    }
  }
};

export const KEYRING_TYPE = {
  HdKeyring: 'HD Key Tree',
  SimpleKeyring: 'Simple Key Pair',
  HardwareKeyring: 'hardware',
  WatchAddressKeyring: 'Watch Address',
  WalletConnectKeyring: 'WalletConnect',
  GnosisKeyring: 'Gnosis',
  CoboArgusKeyring: 'CoboArgus',
  CoinbaseKeyring: 'Coinbase',
} as const;

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
    IMKEY: 'imKey Hardware',
  },
  WATCH: 'Watch Address',
  WALLETCONNECT: 'WalletConnect',
  GNOSIS: 'Gnosis',
  CoboArgus: 'CoboArgus',
  Coinbase: 'Coinbase',
} as const;

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
  KEYRING_CLASS.HARDWARE.IMKEY,
  KEYRING_CLASS.HARDWARE.BITBOX02,
];

export const KEYRING_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Created by Seed Phrase',
  [KEYRING_TYPE.SimpleKeyring]: 'Imported by Private Key',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Contact',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'Imported by BitBox02',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'Imported by Ledger',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'Imported by Trezor',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'Imported by Onekey',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'Imported by GridPlus',
  [KEYRING_CLASS.GNOSIS]: 'Imported by Safe',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'Imported by QRCode Base',
  [KEYRING_CLASS.HARDWARE.IMKEY]: 'Imported by imKey',
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
  ImKey: {
    type: 'imKey Hardware',
    brandName: 'imKey',
  },
} as const;

export enum TX_TYPE_ENUM {
  SEND = 1,
  APPROVE = 2,
  CANCEL_APPROVE = 3,
  CANCEL_TX = 4,
  SIGN_TX = 5,
}

export const IS_CHROME = /Chrome\//i.test(global.navigator?.userAgent);

export const IS_FIREFOX = /Firefox\//i.test(global.navigator?.userAgent);

export let IS_VIVALDI = false;
browser.tabs.onCreated.addListener((tab) => {
  if (tab && 'vivExtData' in tab) {
    IS_VIVALDI = true;
  }
});

export const IS_LINUX = /linux/i.test(global.navigator?.userAgent);

let chromeVersion: number | null = null;

if (IS_CHROME) {
  const matches = global.navigator?.userAgent.match(/Chrome\/(\d+[^.\s])/);
  if (matches && matches.length >= 2) {
    chromeVersion = Number(matches[1]);
  }
}

export const IS_AFTER_CHROME91 = IS_CHROME
  ? chromeVersion && chromeVersion >= 91
  : false;

export const GAS_LEVEL_TEXT = {
  $unknown: 'Unknown',
  slow: 'Standard',
  normal: 'Fast',
  fast: 'Instant',
  custom: 'Custom',
} as const;

export const IS_WINDOWS = /windows/i.test(global.navigator?.userAgent);

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
  CoboArgusConnect = 'CoboArgusConnect',
  CoinbaseConnect = 'CoinbaseConnect',
  ImKeyConnect = 'ImKeyConnect',
}

export const WALLETCONNECT_STATUS_MAP = {
  PENDING: 1,
  CONNECTED: 2,
  WAITING: 3,
  SUBMITTED: 4,
  REJECTED: 5,
  FAILED: 6,
  SUBMITTING: 7,
};

export const INTERNAL_REQUEST_ORIGIN = location.origin;

export const INTERNAL_REQUEST_SESSION = {
  name: 'Rabby',
  origin: INTERNAL_REQUEST_ORIGIN,
  icon: RabbyChainLogo,
};

export const INITIAL_OPENAPI_URL = 'https://api.rabby.io';

export const INITIAL_TESTNET_OPENAPI_URL = 'https://api.testnet.rabby.io';

export const EVENTS = {
  broadcastToUI: 'broadcastToUI',
  broadcastToBackground: 'broadcastToBackground',
  TX_COMPLETED: 'TX_COMPLETED',
  SIGN_FINISHED: 'SIGN_FINISHED',
  TX_SUBMITTING: 'TX_SUBMITTING',
  WALLETCONNECT: {
    STATUS_CHANGED: 'WALLETCONNECT_STATUS_CHANGED',
    SESSION_STATUS_CHANGED: 'SESSION_STATUS_CHANGED',
    SESSION_ACCOUNT_CHANGED: 'SESSION_ACCOUNT_CHANGED',
    SESSION_NETWORK_DELAY: 'SESSION_NETWORK_DELAY',
    INIT: 'WALLETCONNECT_INIT',
    INITED: 'WALLETCONNECT_INITED',
    TRANSPORT_ERROR: 'TRANSPORT_ERROR',
    SCAN_ACCOUNT: 'SCAN_ACCOUNT',
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
  COMMON_HARDWARE: {
    REJECTED: 'COMMON_HARDWARE_REJECTED',
  },
  LOCK_WALLET: 'LOCK_WALLET',
  RELOAD_TX: 'RELOAD_TX',
  SIGN_BEGIN: 'SIGN_BEGIN',
  SIGN_WAITING_AMOUNTED: 'SIGN_WAITING_AMOUNTED',
  // FORCE_EXPIRE_ADDRESS_BALANCE: 'FORCE_EXPIRE_ADDRESS_BALANCE',
};

export const EVENTS_IN_BG = {
  ON_TX_COMPLETED: 'ON_TX_COMPLETED',
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
  COOLWALLET = 'CoolWallet',
  DEFIANT = 'Defiant',
  WALLETCONNECT = 'WALLETCONNECT',
  AIRGAP = 'AirGap',
  IMTOKENOFFLINE = 'imTokenOffline',
  Rainbow = 'Rainbow',
  Bitkeep = 'Bitget',
  // Uniswap = 'Uniswap',
  Zerion = 'Zerion',
  CoboArgus = 'CoboArgus',
  MPCVault = 'MPCVault',
  Coinbase = 'Coinbase',
  IMKEY = 'IMKEY',
  Utila = 'Utila',
}

export enum WALLET_BRAND_CATEGORY {
  MOBILE = 'mobile',
  HARDWARE = 'hardware',
  INSTITUTIONAL = 'institutional',
}

export type ThemeIconType = string | React.FC<React.SVGProps<SVGSVGElement>>;

export type IWalletBrandContent = {
  id: number;
  name: string;
  brand: WALLET_BRAND_TYPES;
  icon: string;
  lightIcon: string;
  image: string;
  rcSvg: Exclude<ThemeIconType, string>;
  /**
   * @description some brand's logo has no dark mode svg because it's colorful,
   * for those brand, we use lightIcon as dark mode svg. When maybeSvg provided
   * for those brand, we set maybeSvg as image string and `ThemeIcon` would rendered
   * as <img />.
   */
  maybeSvg?: ThemeIconType;
  connectType: BRAND_WALLET_CONNECT_TYPE;
  category: WALLET_BRAND_CATEGORY;
  hidden?: boolean;
};

export const WALLET_BRAND_CONTENT: {
  [K in string]: IWalletBrandContent;
} = {
  [WALLET_BRAND_TYPES.AMBER]: {
    id: 0,
    name: 'Amber',
    brand: WALLET_BRAND_TYPES.AMBER,
    icon: IconAmber,
    lightIcon: IconAmber,
    image: LogoAmber,
    rcSvg: RcLogoAmber,
    maybeSvg: LogoAmber,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.BITBOX02]: {
    id: 10,
    name: 'BitBox02',
    brand: WALLET_BRAND_TYPES.BITBOX02,
    icon: IconBitBox02,
    lightIcon: IconBitBox02,
    image: IconBitBox02WithBorder,
    rcSvg: RcIconBitBox02WithBorder,
    maybeSvg: IconBitBox02WithBorder,
    connectType: BRAND_WALLET_CONNECT_TYPE.BitBox02Connect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.COBO]: {
    id: 1,
    name: 'Cobo Wallet',
    brand: WALLET_BRAND_TYPES.COBO,
    icon: IconCobo,
    lightIcon: IconCobo,
    image: LogoCobo,
    rcSvg: RcLogoCobo,
    maybeSvg: LogoCobo,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
    hidden: true,
  },
  [WALLET_BRAND_TYPES.COOLWALLET]: {
    id: 16,
    name: 'CoolWallet',
    brand: WALLET_BRAND_TYPES.COOLWALLET,
    icon: LogoCoolWallet,
    lightIcon: LogoCoolWallet,
    image: LogoCoolWallet,
    rcSvg: RcLogoCoolWallet,
    maybeSvg: LogoCoolWallet,
    connectType: BRAND_WALLET_CONNECT_TYPE.QRCodeBase,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.DEFIANT]: {
    id: 17,
    name: 'Defiant',
    brand: WALLET_BRAND_TYPES.DEFIANT,
    icon: LogoDefiant,
    lightIcon: LogoDefiant,
    image: LogoDefiantWhite,
    rcSvg: RcLogoDefiantWhite,
    maybeSvg: LogoDefiantWhite,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
    hidden: true,
  },
  [WALLET_BRAND_TYPES.WALLETCONNECT]: {
    id: 20,
    name: 'Wallet Connect',
    brand: WALLET_BRAND_TYPES.WALLETCONNECT,
    icon: LogoWalletConnect,
    lightIcon: LogoWalletConnect,
    image: LogoWalletConnectWhite,
    rcSvg: RcLogoWalletConnectWhite,
    maybeSvg: LogoWalletConnectWhite,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.FIREBLOCKS]: {
    id: 11,
    name: 'Fireblocks',
    brand: WALLET_BRAND_TYPES.FIREBLOCKS,
    icon: IconFireblocks,
    lightIcon: IconFireblocks,
    image: IconFireblocksWithBorder,
    rcSvg: RcIconFireblocksWithBorder,
    maybeSvg: IconFireblocksWithBorder,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.GNOSIS]: {
    id: 13,
    name: 'Safe',
    brand: WALLET_BRAND_TYPES.GNOSIS,
    icon: IconGnosis,
    lightIcon: IconGnosis,
    image: IconGnosis,
    rcSvg: RcIconGnosis,
    maybeSvg: IconGnosis,
    connectType: BRAND_WALLET_CONNECT_TYPE.GnosisConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.GRIDPLUS]: {
    id: 12,
    name: 'GridPlus',
    brand: WALLET_BRAND_TYPES.GRIDPLUS,
    icon: IconGridPlus,
    lightIcon: IconGridPlus,
    image: IconGridPlus,
    rcSvg: RcIconGridPlus,
    maybeSvg: IconGridPlus,
    connectType: BRAND_WALLET_CONNECT_TYPE.GridPlusConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.IMTOKEN]: {
    id: 2,
    name: 'imToken',
    brand: WALLET_BRAND_TYPES.IMTOKEN,
    icon: IconImtoken,
    lightIcon: IconImtoken,
    image: LogoImtoken,
    rcSvg: RcLogoImtoken,
    maybeSvg: LogoImtoken,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.JADE]: {
    id: 3,
    name: 'Jade Wallet',
    brand: WALLET_BRAND_TYPES.JADE,
    icon: IconJade,
    lightIcon: IconJade,
    image: LogoJade,
    rcSvg: RcLogoJade,
    maybeSvg: LogoJade,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.KEYSTONE]: {
    id: 15,
    name: 'Keystone',
    brand: WALLET_BRAND_TYPES.KEYSTONE,
    icon: LogoKeystone,
    lightIcon: LogoKeystone,
    image: LogoKeystone,
    rcSvg: RcLogoKeystone,
    maybeSvg: LogoKeystone,
    connectType: BRAND_WALLET_CONNECT_TYPE.QRCodeBase,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.AIRGAP]: {
    id: 18,
    name: 'AirGap Vault',
    brand: WALLET_BRAND_TYPES.AIRGAP,
    icon: LogoAirGap,
    lightIcon: LogoAirGap,
    image: LogoAirGap,
    rcSvg: RcLogoAirGap,
    maybeSvg: LogoAirGap,
    connectType: BRAND_WALLET_CONNECT_TYPE.QRCodeBase,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.LEDGER]: {
    id: 4,
    name: 'Ledger',
    brand: WALLET_BRAND_TYPES.LEDGER,
    icon: LogoLedgerWhite,
    lightIcon: LogoLedgerWhite,
    image: LogoLedgerDark,
    rcSvg: RcLogoLedgerDark,
    maybeSvg: LogoLedgerDark,
    connectType: BRAND_WALLET_CONNECT_TYPE.LedgerConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.MATHWALLET]: {
    id: 5,
    name: 'Math Wallet',
    brand: WALLET_BRAND_TYPES.MATHWALLET,
    icon: IconMath,
    lightIcon: IconMath,
    image: LogoMath,
    rcSvg: RcLogoMath,
    maybeSvg: LogoMath,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.METAMASK]: {
    id: 14,
    name: 'MetaMask Mobile',
    brand: WALLET_BRAND_TYPES.METAMASK,
    icon: IconMetaMask,
    lightIcon: IconMetaMask,
    image: IconMetaMask,
    rcSvg: RcIconMetaMask,
    maybeSvg: RcIconMetaMask,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.ONEKEY]: {
    id: 6,
    name: 'OneKey',
    brand: WALLET_BRAND_TYPES.ONEKEY,
    icon: IconOnekey,
    lightIcon: IconOnekey,
    image: LogoOnekey,
    rcSvg: RcLogoOnekey,
    maybeSvg: LogoOnekey,
    connectType: BRAND_WALLET_CONNECT_TYPE.OneKeyConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.TP]: {
    id: 7,
    name: 'TokenPocket',
    brand: WALLET_BRAND_TYPES.TP,
    icon: IconTokenpocket,
    lightIcon: IconTokenpocket,
    image: LogoTp,
    rcSvg: RcLogoTp,
    maybeSvg: LogoTp,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.TREZOR]: {
    id: 8,
    name: 'Trezor',
    brand: WALLET_BRAND_TYPES.TREZOR,
    icon: IconTrezor,
    lightIcon: IconTrezor,
    image: LogoTrezor,
    rcSvg: RcLogoTrezor,
    maybeSvg: LogoTrezor,
    connectType: BRAND_WALLET_CONNECT_TYPE.TrezorConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.TRUSTWALLET]: {
    id: 9,
    name: 'Trust Wallet',
    brand: WALLET_BRAND_TYPES.TRUSTWALLET,
    icon: IconTrust,
    lightIcon: IconTrust,
    image: LogoTrust,
    rcSvg: RcLogoTrust,
    maybeSvg: LogoTrust,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.Rainbow]: {
    id: 21,
    name: 'Rainbow',
    brand: WALLET_BRAND_TYPES.Rainbow,
    icon: LogoRainbow,
    lightIcon: LogoRainbow,
    image: LogoRainbow,
    rcSvg: RcLogoRainbow,
    maybeSvg: LogoRainbow,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.Bitkeep]: {
    id: 22,
    name: 'Bitget Wallet',
    brand: WALLET_BRAND_TYPES.Bitkeep,
    icon: LogoBitkeep,
    lightIcon: LogoBitkeep,
    image: LogoBitkeep,
    rcSvg: RcLogoBitkeep,
    maybeSvg: LogoBitkeep,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.Zerion]: {
    id: 23,
    name: 'Zerion Wallet',
    brand: WALLET_BRAND_TYPES.Zerion,
    icon: LogoZerion,
    lightIcon: LogoZerion,
    image: LogoZerion,
    rcSvg: RcLogoZerion,
    maybeSvg: LogoZerion,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  // [WALLET_BRAND_TYPES.Uniswap]: {
  //   id: 24,
  //   name: 'Uniswap Wallet',
  //   brand: WALLET_BRAND_TYPES.Uniswap,
  //   icon: LogoUniswap,
  //   image: LogoUniswap,
  //   connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
  //   category: WALLET_BRAND_CATEGORY.MOBILE,
  // },
  [WALLET_BRAND_TYPES.CoboArgus]: {
    id: 25,
    name: 'Cobo Argus',
    brand: WALLET_BRAND_TYPES.CoboArgus,
    icon: LogoCoboArgus,
    lightIcon: LogoCoboArgus,
    image: LogoCoboArgus,
    rcSvg: RcLogoCoboArgus,
    maybeSvg: LogoCoboArgus,
    connectType: BRAND_WALLET_CONNECT_TYPE.CoboArgusConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.MPCVault]: {
    id: 26,
    name: 'MPCVault',
    brand: WALLET_BRAND_TYPES.MPCVault,
    icon: LogoMPCVault,
    lightIcon: LogoMPCVault,
    image: LogoMPCVault,
    rcSvg: RcLogoMPCVault,
    maybeSvg: LogoMPCVault,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
  },
  [WALLET_BRAND_TYPES.IMTOKENOFFLINE]: {
    id: 27,
    name: 'imToken',
    brand: WALLET_BRAND_TYPES.IMTOKENOFFLINE,
    icon: LogoImtokenOffline,
    lightIcon: LogoImtokenOffline,
    image: LogoImtokenOffline,
    rcSvg: RcLogoImtokenOffline,
    maybeSvg: LogoImtokenOffline,
    connectType: BRAND_WALLET_CONNECT_TYPE.QRCodeBase,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.Coinbase]: {
    id: 28,
    name: 'Coinbase',
    brand: WALLET_BRAND_TYPES.Coinbase,
    lightIcon: IconCoinbase,
    icon: IconCoinbase,
    image: IconCoinbase,
    rcSvg: RCIconCoinbase,
    connectType: BRAND_WALLET_CONNECT_TYPE.CoinbaseConnect,
    category: WALLET_BRAND_CATEGORY.MOBILE,
  },
  [WALLET_BRAND_TYPES.IMKEY]: {
    id: 29,
    name: 'imKey',
    brand: WALLET_BRAND_TYPES.IMKEY,
    icon: IconImKey,
    lightIcon: IconImKey,
    image: IconImKey,
    rcSvg: RCIconImKey,
    maybeSvg: IconImKey,
    connectType: BRAND_WALLET_CONNECT_TYPE.ImKeyConnect,
    category: WALLET_BRAND_CATEGORY.HARDWARE,
  },
  [WALLET_BRAND_TYPES.Utila]: {
    id: 30,
    name: 'Utila',
    brand: WALLET_BRAND_TYPES.Utila,
    icon: IconUtila,
    lightIcon: IconUtila,
    image: IconUtila,
    rcSvg: RCIconUtila,
    connectType: BRAND_WALLET_CONNECT_TYPE.WalletConnect,
    category: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
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
  [HARDWARE_KEYRING_TYPES.ImKey.type]: IconImKey,
  // [HARDWARE_KEYRING_TYPES.Keystone.type]: LogoKeystone,
} as const;

type BasicKeyringNames = {
  [P in keyof typeof KEYRING_TYPE]: typeof KEYRING_TYPE[P];
};
export type BasicKeyrings = BasicKeyringNames[keyof BasicKeyringNames];

type HardwareKeyringNames = {
  [P in keyof typeof HARDWARE_KEYRING_TYPES]: typeof HARDWARE_KEYRING_TYPES[P]['type'];
};
export type HardwareKeyrings = HardwareKeyringNames[keyof HardwareKeyringNames];

export type KeyringWithIcon = keyof typeof KEYRING_ICONS;

export const KEYRING_ICONS_WHITE: Record<KeyringWithIcon, string> = {
  [KEYRING_CLASS.MNEMONIC]: IconMnemonicWhite,
  [KEYRING_CLASS.PRIVATE_KEY]: IconPrivateKeyWhite,
  [KEYRING_CLASS.WATCH]: IconWatchWhite,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: IconBitBox02,
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LogoLedgerWhite,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: LogoOnekey,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: IconTrezor24,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: IconGridPlus,
  [HARDWARE_KEYRING_TYPES.ImKey.type]: IconImKey,
  // [HARDWARE_KEYRING_TYPES.Keystone.type]: LogoKeystone,
};

export const KEYRING_PURPLE_LOGOS = {
  [KEYRING_CLASS.MNEMONIC]: IconMnemonicInk,
  [KEYRING_CLASS.PRIVATE_KEY]: IconPrivateKeyInk,
  [KEYRING_CLASS.WATCH]: IconWatchPurple,
};

export const KEYRINGS_LOGOS: Record<KeyringWithIcon, string> = {
  [KEYRING_CLASS.MNEMONIC]: IconMnemonicWhite,
  [KEYRING_CLASS.PRIVATE_KEY]: LogoPrivateKey,
  [KEYRING_CLASS.WATCH]: IconWatchWhite,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: IconBitBox02WithBorder,
  [HARDWARE_KEYRING_TYPES.Ledger.type]: LogoLedgerWhite,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: IconOneKey18,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: IconTrezor24Border,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: IconGridPlus,
  [HARDWARE_KEYRING_TYPES.ImKey.type]: IconImKey,
  // [HARDWARE_KEYRING_TYPES.Keystone.type]: LogoKeystone,
};

type NextKeyringIconType = {
  dataDark: ThemeIconType & string;
  rcDark: Exclude<ThemeIconType, string>;
  dataLight: ThemeIconType & string;
  rcLight: Exclude<ThemeIconType, string>;
};

export const NEXT_KEYRING_ICONS = {
  [KEYRING_CLASS.MNEMONIC]: {
    dataLight: KEYRING_ICONS_WHITE[KEYRING_CLASS.MNEMONIC],
    dataDark: KEYRING_ICONS[KEYRING_CLASS.MNEMONIC],
    rcLight: RcIconMnemonicWhite,
    rcDark: RcIconMnemonicInk,
  } as NextKeyringIconType,
  [KEYRING_CLASS.PRIVATE_KEY]: {
    dataLight: KEYRING_ICONS_WHITE[KEYRING_CLASS.PRIVATE_KEY],
    dataDark: KEYRING_ICONS[KEYRING_CLASS.PRIVATE_KEY],
    rcLight: RcIconPrivateKeyWhite,
    rcDark: RcIconPrivateKeyInk,
  } as NextKeyringIconType,
  [KEYRING_CLASS.WATCH]: {
    dataLight: KEYRING_ICONS_WHITE[KEYRING_CLASS.WATCH],
    dataDark: KEYRING_ICONS[KEYRING_CLASS.WATCH],
    rcLight: RcIconWatchWhite,
    rcDark: RcIconWatchPurple,
  } as NextKeyringIconType,
  [HARDWARE_KEYRING_TYPES.BitBox02.type]: {
    dataLight: KEYRING_ICONS_WHITE[HARDWARE_KEYRING_TYPES.BitBox02.type],
    dataDark: KEYRING_ICONS[HARDWARE_KEYRING_TYPES.BitBox02.type],
    rcLight: RcIconBitBox02,
    rcDark: RcIconBitBox02,
  } as NextKeyringIconType,
  [HARDWARE_KEYRING_TYPES.Ledger.type]: {
    dataLight: KEYRING_ICONS_WHITE[HARDWARE_KEYRING_TYPES.Ledger.type],
    dataDark: KEYRING_ICONS[HARDWARE_KEYRING_TYPES.Ledger.type],
    rcLight: RcLogoLedgerWhite,
    rcDark: RcLogoLedgerWhite,
  } as NextKeyringIconType,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: {
    dataLight: KEYRING_ICONS_WHITE[HARDWARE_KEYRING_TYPES.Onekey.type],
    dataDark: KEYRING_ICONS[HARDWARE_KEYRING_TYPES.Onekey.type],
    rcLight: RcLogoOnekey,
    rcDark: RcLogoOnekey,
  } as NextKeyringIconType,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: {
    dataLight: KEYRING_ICONS_WHITE[HARDWARE_KEYRING_TYPES.Trezor.type],
    dataDark: KEYRING_ICONS[HARDWARE_KEYRING_TYPES.Trezor.type],
    rcLight: RcIconTrezor24,
    rcDark: RcIconTrezor24,
  } as NextKeyringIconType,
  [HARDWARE_KEYRING_TYPES.GridPlus.type]: {
    dataLight: KEYRING_ICONS_WHITE[HARDWARE_KEYRING_TYPES.GridPlus.type],
    dataDark: KEYRING_ICONS[HARDWARE_KEYRING_TYPES.GridPlus.type],
    rcLight: RcIconGridPlus,
    rcDark: RcIconGridPlus,
  } as NextKeyringIconType,
  [HARDWARE_KEYRING_TYPES.ImKey.type]: {
    dataLight: KEYRING_ICONS_WHITE[HARDWARE_KEYRING_TYPES.ImKey.type],
    dataDark: KEYRING_ICONS[HARDWARE_KEYRING_TYPES.ImKey.type],
    rcLight: RCIconImKey,
    rcDark: RCIconImKey,
  } as NextKeyringIconType,
};

export const RC_KEYRING_ICONS = Object.entries(NEXT_KEYRING_ICONS).reduce(
  (acc, [keyringClass, keyringIcons]) => {
    acc[keyringClass] = keyringIcons;
    return acc;
  },
  {} as {
    [P in keyof typeof NEXT_KEYRING_ICONS]: {
      rcDark: typeof NEXT_KEYRING_ICONS[P]['rcDark'];
      rcLight: typeof NEXT_KEYRING_ICONS[P]['rcLight'];
    };
  }
);

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

export const GASPRICE_RANGE = ensureChainHashValid({
  [CHAINS_ENUM.ETH]: [0, 20000],
  [CHAINS_ENUM.BOBA]: [0, 20000],
  [CHAINS_ENUM.OP]: [0, 20000],
  [CHAINS_ENUM.BASE]: [0, 20000],
  [CHAINS_ENUM.ZORA]: [0, 20000],
  [CHAINS_ENUM.ERA]: [0, 20000],
  [CHAINS_ENUM.KAVA]: [0, 20000],
  [CHAINS_ENUM.ARBITRUM]: [0, 20000],
  [CHAINS_ENUM.AURORA]: [0, 20000],
  [CHAINS_ENUM.BSC]: [0, 20000],
  [CHAINS_ENUM.AVAX]: [0, 40000],
  [CHAINS_ENUM.POLYGON]: [0, 100000],
  [CHAINS_ENUM.FTM]: [0, 100000],
  [CHAINS_ENUM.GNOSIS]: [0, 500000],
  [CHAINS_ENUM.OKT]: [0, 50000],
  [CHAINS_ENUM.HECO]: [0, 100000],
  [CHAINS_ENUM.CELO]: [0, 100000],
  [CHAINS_ENUM.MOVR]: [0, 50000],
  [CHAINS_ENUM.CRO]: [0, 500000],
  [CHAINS_ENUM.BTT]: [0, 20000000000],
  [CHAINS_ENUM.METIS]: [0, 50000],
});

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
  [KEYRING_CLASS.HARDWARE.ONEKEY]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.TREZOR]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.BITBOX02]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: KEYRING_CATEGORY.Hardware,
  [KEYRING_CLASS.WALLETCONNECT]: KEYRING_CATEGORY.WalletConnect,
  [KEYRING_CLASS.Coinbase]: KEYRING_CATEGORY.WalletConnect,
  [KEYRING_CLASS.GNOSIS]: KEYRING_CATEGORY.Contract,
  [KEYRING_CLASS.HARDWARE.IMKEY]: KEYRING_CATEGORY.Hardware,
};

export const SWAP_FEE_PRECISION = 1e5;

export const DEFAULT_GAS_LIMIT_RATIO = 1.5;

export const SAFE_GAS_LIMIT_RATIO = {
  '1284': 2,
  '1285': 2,
  '1287': 2,
};
export const GAS_TOP_UP_ADDRESS = '0x7559e1bbe06e94aeed8000d5671ed424397d25b5';
export const GAS_TOP_UP_PAY_ADDRESS =
  '0x1f1f2bf8942861e6194fda1c0a9f13921c0cf117';
export const FREE_GAS_ADDRESS = '0x76dd65529dc6c073c1e0af2a5ecc78434bdbf7d9';

export const GAS_TOP_UP_SUPPORT_TOKENS: Record<string, string[]> = {
  arb: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    'arb',
  ],
  astar: ['astar'],
  aurora: ['aurora'],
  avax: ['avax'],
  base: ['0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'base'],
  boba: ['boba'],
  bsc: [
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    '0x55d398326f99059ff775485246999027b3197955',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    'bsc',
  ],
  canto: ['canto'],
  celo: ['celo'],
  cro: ['0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23', 'cro'],
  era: ['era'],
  eth: [
    '0x6b175474e89094c44da98b954eedeac495271d0f',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    'eth',
  ],
  evmos: ['evmos'],
  ftm: ['0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83', 'ftm'],
  hmy: ['hmy'],
  kava: ['kava'],
  kcc: ['kcc'],
  linea: ['linea'],
  matic: [
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    'matic',
  ],
  metis: ['metis'],
  mnt: ['mnt'],
  mobm: ['mobm'],
  movr: ['movr'],
  nova: ['nova'],
  okt: ['okt'],
  op: [
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    'op',
  ],
  opbnb: ['opbnb'],
  pls: ['pls'],
  pze: ['pze'],
  scrl: ['scrl'],
  xdai: ['xdai'],
};

export const EXTERNAL_RESOURCE_DOMAIN_BLACK_LIST = ['5degrees.io'];

export const ALIAS_ADDRESS = {
  [GAS_TOP_UP_ADDRESS]: 'Rabby Gas Top Up',
  [GAS_TOP_UP_PAY_ADDRESS]: 'Rabby Gas Top Up',
  [FREE_GAS_ADDRESS]: 'Free Gas',
};

// non-opstack L2 chains
export const L2_ENUMS = [
  CHAINS_ENUM.ARBITRUM,
  CHAINS_ENUM.AURORA,
  CHAINS_ENUM.NOVA,
  CHAINS_ENUM.BOBA,
  CHAINS_ENUM.MANTLE,
  CHAINS_ENUM.LINEA,
  CHAINS_ENUM.MANTA,
  CHAINS_ENUM.SCRL,
  CHAINS_ENUM.ERA,
  CHAINS_ENUM.PZE,
  CHAINS_ENUM.MANTA,
  CHAINS_ENUM.OP,
  CHAINS_ENUM.BASE,
  CHAINS_ENUM.ZORA,
  CHAINS_ENUM.OPBNB,
  CHAINS_ENUM.BLAST,
];

// opstack L2 chains
export const OP_STACK_ENUMS = [
  CHAINS_ENUM.OP,
  CHAINS_ENUM.BASE,
  CHAINS_ENUM.ZORA,
  CHAINS_ENUM.OPBNB,
  CHAINS_ENUM.BLAST,
];

export const ARB_LIKE_L2_CHAINS = [CHAINS_ENUM.ARBITRUM, CHAINS_ENUM.AURORA];

export const CAN_NOT_SPECIFY_INTRINSIC_GAS_CHAINS = [...L2_ENUMS];

export const CAN_ESTIMATE_L1_FEE_CHAINS = [
  ...OP_STACK_ENUMS,
  CHAINS_ENUM.SCRL,
  ...ARB_LIKE_L2_CHAINS,
  CHAINS_ENUM.PZE,
  CHAINS_ENUM.ERA,
  CHAINS_ENUM.LINEA,
];

export const SecurityEngineLevelOrder = [
  Level.FORBIDDEN,
  Level.DANGER,
  Level.WARNING,
  Level.SAFE,
  null,
  Level.ERROR,
  'proceed',
];

export const SecurityEngineLevel = {
  [Level.SAFE]: {
    color: '#27C193',
    icon: IconSafe,
    text: 'Safe',
  },
  [Level.WARNING]: {
    color: '#FFB020',
    icon: IconWarning,
    text: 'Warning',
  },
  [Level.DANGER]: {
    color: '#EC5151',
    icon: IconDanger,
    text: 'Danger',
  },
  [Level.FORBIDDEN]: {
    color: '#AF160E',
    icon: IconForbidden,
    text: 'Forbidden',
  },
  [Level.ERROR]: {
    color: '#B4BDCC',
    icon: IconError,
    text: 'Security engine failed',
  },
  closed: {
    color: '#B4BDCC',
    icon: IconClosed,
    text: 'Closed',
  },
  proceed: {
    color: '#707280',
    icon: IconProceed,
    text: 'Proceed',
  },
};

declare global {
  interface Window {
    __is_rd__?: boolean;
  }
}

export const IS_RD = typeof window === 'undefined' ? false : window.__is_rd__;

export const BRAND_ALIAN_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Seed Phrase',
  [KEYRING_TYPE.SimpleKeyring]: 'Private Key',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Contact',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'Ledger',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'Trezor',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'Onekey',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'BitBox02',
  [KEYRING_CLASS.GNOSIS]: 'Safe',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'GridPlus',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'Keystone',
  [WALLET_BRAND_TYPES.TP]: WALLET_BRAND_CONTENT.TP.name,
  [WALLET_BRAND_TYPES.METAMASK]: WALLET_BRAND_CONTENT.MetaMask.name,
  [WALLET_BRAND_TYPES.IMTOKEN]: WALLET_BRAND_CONTENT.IMTOKEN.name,
  [WALLET_BRAND_TYPES.MATHWALLET]: WALLET_BRAND_CONTENT.MATHWALLET.name,
  [WALLET_BRAND_TYPES.TRUSTWALLET]: WALLET_BRAND_CONTENT.TRUSTWALLET.name,
  [KEYRING_CLASS.Coinbase]: WALLET_BRAND_CONTENT.Coinbase.name,
  [KEYRING_CLASS.HARDWARE.IMKEY]: 'imKey',
};

export const GNOSIS_SUPPORT_CHAINS = ensureChainListValid([
  CHAINS_ENUM.ETH,
  CHAINS_ENUM.BSC,
  CHAINS_ENUM.POLYGON,
  CHAINS_ENUM.GNOSIS,
  CHAINS_ENUM.AVAX,
  CHAINS_ENUM.OP,
  CHAINS_ENUM.ARBITRUM,
  CHAINS_ENUM.AURORA,
  CHAINS_ENUM.BASE,
  CHAINS_ENUM.CELO,
  CHAINS_ENUM.PZE,
  CHAINS_ENUM.ERA,
]);

export const COBO_ARGUS_SUPPORT_CHAINS = ensureChainListValid([
  CHAINS_ENUM.ETH,
  CHAINS_ENUM.OP,
  CHAINS_ENUM.BSC,
  CHAINS_ENUM.POLYGON,
  CHAINS_ENUM.ARBITRUM,
  CHAINS_ENUM.AVAX,
  CHAINS_ENUM.BASE,
  CHAINS_ENUM.MANTLE,
  CHAINS_ENUM.GNOSIS,
]);

export const WALLET_SORT_SCORE = [
  //mobile
  WALLET_BRAND_TYPES.METAMASK,
  WALLET_BRAND_TYPES.TRUSTWALLET,
  WALLET_BRAND_TYPES.TP,
  WALLET_BRAND_TYPES.IMTOKEN,
  WALLET_BRAND_TYPES.MATHWALLET,
  WALLET_BRAND_TYPES.Rainbow,
  WALLET_BRAND_TYPES.Bitkeep,
  WALLET_BRAND_TYPES.Zerion,
  // WALLET_BRAND_TYPES.Uniswap,
  WALLET_BRAND_TYPES.WALLETCONNECT,
  //hardware wallet
  WALLET_BRAND_TYPES.LEDGER,
  WALLET_BRAND_TYPES.TREZOR,
  WALLET_BRAND_TYPES.GRIDPLUS,
  WALLET_BRAND_TYPES.ONEKEY,
  WALLET_BRAND_TYPES.KEYSTONE,
  WALLET_BRAND_TYPES.BITBOX02,
  WALLET_BRAND_TYPES.COOLWALLET,
  WALLET_BRAND_TYPES.AIRGAP,
  WALLET_BRAND_TYPES.IMTOKENOFFLINE,
  WALLET_BRAND_TYPES.Coinbase,
  //institutional
  WALLET_BRAND_TYPES.GNOSIS,
  WALLET_BRAND_TYPES.CoboArgus,
  WALLET_BRAND_TYPES.AMBER,
  WALLET_BRAND_TYPES.FIREBLOCKS,
  WALLET_BRAND_TYPES.JADE,
  WALLET_BRAND_TYPES.MPCVault,
].reduce((pre, now, i) => {
  pre[now] = i + 1;
  return pre;
}, {} as { [k: string]: number });

export const SWAP_FEE_ADDRESS = '0x39041F1B366fE33F9A5a79dE5120F2Aee2577ebc';

export const ETH_USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';

export const DEX = {
  [DEX_ENUM.ONEINCH]: {
    id: DEX_ENUM.ONEINCH,
    logo: Logo1inch,
    name: '1inch',
    chains: DEX_SUPPORT_CHAINS[DEX_ENUM.ONEINCH],
  },
  [DEX_ENUM.ZEROXAPI]: {
    id: DEX_ENUM.ZEROXAPI,
    logo: Logo0X,
    name: '0x',
    chains: DEX_SUPPORT_CHAINS[DEX_ENUM.ZEROXAPI],
  },
  [DEX_ENUM.PARASWAP]: {
    id: DEX_ENUM.PARASWAP,
    logo: LogoParaswap,
    name: 'ParaSwap',
    chains: DEX_SUPPORT_CHAINS[DEX_ENUM.PARASWAP],
  },
};

export const DEX_WITH_WRAP = {
  ...DEX,
  [DEX_ENUM.WRAPTOKEN]: {
    logo: LogoTokenDefault,
    name: 'Wrap Contract',
    chains: DEX_SUPPORT_CHAINS.WrapToken,
  },
};

export const CEX = {
  binance: {
    id: 'binance',
    name: 'Binance',
    logo: LogoBinance,
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    logo: LogoCoinbase,
  },
  okex: {
    id: 'okex',
    name: 'OKX',
    logo: LogoOkx,
  },
};

export const SWAP_SUPPORT_CHAINS = Array.from(
  new Set(Object.values(DEX_SUPPORT_CHAINS).flat())
);

export enum SIGN_PERMISSION_TYPES {
  MAINNET_AND_TESTNET = 'MAINNET_AND_TESTNET',
  TESTNET = 'TESTNET',
}
export const SIGN_PERMISSION_OPTIONS = [
  {
    label: 'Mainnet & Testnet',
    value: SIGN_PERMISSION_TYPES.MAINNET_AND_TESTNET,
  },
  {
    label: 'Only Testnets',
    value: SIGN_PERMISSION_TYPES.TESTNET,
  },
];

export enum CANCEL_TX_TYPE {
  QUICK_CANCEL = 'QUICK_CANCEL',
  ON_CHAIN_CANCEL = 'ON_CHAIN_CANCEL',
}
export const REJECT_SIGN_TEXT_KEYRINGS = [KEYRING_TYPE.CoboArgusKeyring];

export enum DARK_MODE_TYPE {
  'light' = 0,
  'dark' = 1,
  'system' = 2,
}

export const ThemeModes = [
  {
    code: DARK_MODE_TYPE.system,
    name: 'System',
  },
  {
    code: DARK_MODE_TYPE.light,
    name: 'Light',
  },
  {
    code: DARK_MODE_TYPE.dark,
    name: 'Dark',
  },
];

export const imKeyUSBVendorId = 0x096e;
