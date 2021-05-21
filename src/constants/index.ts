import IconBscLogo from 'ui/assets/chain-logos/bsc.svg';
import IconDaiLogo from 'ui/assets/chain-logos/dai.svg';
import IconEthLogo from 'ui/assets/chain-logos/eth.svg';
import IconHecoLogo from 'ui/assets/chain-logos/heco.svg';
import IconPolygonLogo from 'ui/assets/chain-logos/polygon.svg';

export enum APPROVAL_STATE {
  LOCK,
  UNLOCK,
  CONNECT,
  APPROVAL,
  REQUEST,
  END,
}

export enum CHAINS_ENUM {
  ETH = 'ETH',
  BSC = 'BSC',
  DAI = 'DAI',
  HECO = 'HECO',
  POLYGON = 'POLYGON',
}

export const CHAINS = {
  [CHAINS_ENUM.ETH]: {
    id: 1,
    name: 'Ethereum',
    hex: '0x1',
    enum: CHAINS_ENUM.ETH,
    logo: IconEthLogo,
  },
  [CHAINS_ENUM.BSC]: {
    id: 56,
    name: 'BSC',
    hex: '0x38',
    enum: CHAINS_ENUM.BSC,
    logo: IconBscLogo,
  },
  [CHAINS_ENUM.DAI]: {
    id: 100,
    name: 'XDAI',
    hex: '0x64',
    enum: CHAINS_ENUM.DAI,
    logo: IconDaiLogo,
  },
  [CHAINS_ENUM.HECO]: {
    id: 128,
    name: 'Heco',
    hex: '0x80',
    enum: CHAINS_ENUM.HECO,
    logo: IconHecoLogo,
  },
  [CHAINS_ENUM.POLYGON]: {
    id: 137,
    name: 'Polygon',
    hex: '0x89',
    enum: CHAINS_ENUM.POLYGON,
    logo: IconPolygonLogo,
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
