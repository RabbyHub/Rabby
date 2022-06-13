import { CHAINS, CHAINS_ENUM } from '@debank/common';
import IconEN from 'ui/assets/langs/en.svg';
import IconAmber from 'ui/assets/walletlogo/amber.png';
import LogoAmber from 'ui/assets/walletlogo/AmberLogo.png';
import {
  default as IconBitBox02,
  default as IconBitBox02WithBorder,
} from 'ui/assets/walletlogo/bitbox02.png';
import IconCobo from 'ui/assets/walletlogo/cobo.png';
import LogoCobo from 'ui/assets/walletlogo/CoboLogo.png';
import IconFireblocksWithBorder from 'ui/assets/walletlogo/fireblocks-border.png';
import IconFireblocks from 'ui/assets/walletlogo/fireblocks.png';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import IconGridPlus from 'ui/assets/walletlogo/gridplus.png';
import IconMnemonicWhite from 'ui/assets/walletlogo/IconMnemonic-white.svg';
import IconWatchWhite from 'ui/assets/walletlogo/IconWatch-white.svg';
import IconImtoken from 'ui/assets/walletlogo/imtoken.png';
import LogoImtoken from 'ui/assets/walletlogo/imTokenLogo.png';
import IconJade from 'ui/assets/walletlogo/jade.png';
import LogoJade from 'ui/assets/walletlogo/JadeLogo.png';
import LogoKeystone from 'ui/assets/walletlogo/keystone.png';
import LogoLedgerDark from 'ui/assets/walletlogo/ledgerdark.png';
import LogoLedgerWhite from 'ui/assets/walletlogo/ledgerwhite.png';
import IconMath from 'ui/assets/walletlogo/math.png';
import LogoMath from 'ui/assets/walletlogo/MathWalletLogo.png';
import IconMetaMask from 'ui/assets/walletlogo/metamask.svg';
import IconMnemonicInk from 'ui/assets/walletlogo/mnemonic-ink.svg';
import LogoMnemonic from 'ui/assets/walletlogo/mnemoniclogo.svg';
import IconOnekey from 'ui/assets/walletlogo/onekey.png';
import IconOneKey18 from 'ui/assets/walletlogo/onekey18.png';
import LogoOnekey from 'ui/assets/walletlogo/onekey28.png';
import IconPrivateKeyWhite from 'ui/assets/walletlogo/private-key-white.svg';
import IconPrivateKeyInk from 'ui/assets/walletlogo/privatekey-ink.svg';
import LogoPrivateKey from 'ui/assets/walletlogo/privatekeylogo.svg';
import LogoTp from 'ui/assets/walletlogo/TokenPocketLogo.png';
import IconTokenpocket from 'ui/assets/walletlogo/tp.png';
import IconTrezor from 'ui/assets/walletlogo/trezor.png';
import IconTrezor24Border from 'ui/assets/walletlogo/trezor24-border.png';
import IconTrezor24 from 'ui/assets/walletlogo/trezor24.png';
import LogoTrezor from 'ui/assets/walletlogo/Trezor28.png';
import IconTrust from 'ui/assets/walletlogo/trust.png';
import LogoTrust from 'ui/assets/walletlogo/TrustWalletLogo.png';
import IconWatchPurple from 'ui/assets/walletlogo/watch-purple.svg';
import LogoWatch from 'ui/assets/walletlogo/watchlogo.svg';

export { CHAINS, CHAINS_ENUM };

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
