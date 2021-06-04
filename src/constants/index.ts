import { Chain } from 'background/service/chain';
import IconBscLogo from 'ui/assets/chain-logos/bsc.svg';
import IconDaiLogo from 'ui/assets/chain-logos/dai.svg';
import IconEthLogo from 'ui/assets/chain-logos/eth.svg';
// import IconHecoLogo from 'ui/assets/chain-logos/heco.svg';
import IconOKTLogo from 'ui/assets/chain-logos/okex.svg';
import IconPolygonLogo from 'ui/assets/chain-logos/polygon.svg';
import IconBscWhiteLogo from 'ui/assets/chain-logos/bsc-white.svg';
import IconDaiWhiteLogo from 'ui/assets/chain-logos/dai-white.svg';
import IconEthWhiteLogo from 'ui/assets/chain-logos/eth-white.svg';
// import IconHecoWhiteLogo from 'ui/assets/chain-logos/heco-white.svg';
import IconPolygonWhiteLogo from 'ui/assets/chain-logos/polygon-white.svg';
import IconFantomWhiteLogo from 'ui/assets/chain-logos/fantom-white.svg';
import IconFantom from 'ui/assets/chain-logos/fantom.svg';
import IconOKTWhiteLogo from 'ui/assets/chain-logos/okex-white.svg';

export enum CHAINS_ENUM {
  ETH = 'ETH',
  BSC = 'BSC',
  DAI = 'DAI',
  HECO = 'HECO',
  POLYGON = 'POLYGON',
  FTM = 'FTM',
  OKT = 'OKT',
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
  },
  [CHAINS_ENUM.DAI]: {
    id: 100,
    name: 'xDai',
    serverId: 'xdai',
    hex: '0x64',
    enum: CHAINS_ENUM.DAI,
    logo: IconDaiLogo,
    whiteLogo: IconDaiWhiteLogo,
    network: '100',
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
  },
  [CHAINS_ENUM.OKT]: {
    id: 66,
    serverId: 'okt',
    name: 'OKExChain',
    enum: CHAINS_ENUM.OKT,
    logo: IconOKTLogo,
    whiteLogo: IconOKTWhiteLogo,
    hex: '0x42',
    network: '66',
  },
};

export const KEYRING_TYPE = {
  HdKeyring: 'HD Key Tree',
  SimpleKeyring: 'Simple Key Pair',
  HardwareKeyring: 'hardware',
  WatchAddressKeyring: 'Watch Address',
};

export const KEYRING_TYPE_TEXT = {
  [KEYRING_TYPE.HdKeyring]: 'Mnemonics addresses',
  [KEYRING_TYPE.SimpleKeyring]: 'Private key addresses',
  [KEYRING_TYPE.HardwareKeyring]: 'Hardware wallet addresses',
  [KEYRING_TYPE.WatchAddressKeyring]: 'Watch Address',
};

export const KEYRING_CLASS = {
  PRIVATE_KEY: 'Simple Key Pair',
  MNEMONIC: 'HD Key Tree',
  HARDWARE: {
    TREZOR: 'Trezor Hardware',
    LEDGER: 'Ledger Hardware',
    ONEKEY: 'Onekey Hardware',
  },
  WATCH: 'Watch Address',
};

export const HARDWARE_KEYRING_TYPES = {
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
};

export enum TX_TYPE_ENUM {
  SEND = 1,
  APPROVE = 2,
  CANCEL_APPROVE = 3,
  CANCEL_TX = 4,
  SIGN_TX = 5,
}

// ref: https://github.com/ethereum/yellowpaper/blob/fa00ff14c2c44198635d7b93f848fc51ca03fa39/Paper.tex#L1833
export const DEFAULT_GAS_LIMIT = '0x5208';
