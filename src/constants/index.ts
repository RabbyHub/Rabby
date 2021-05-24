import { Chain } from 'background/service/chain';
import IconBscLogo from 'ui/assets/chain-logos/bsc.svg';
import IconDaiLogo from 'ui/assets/chain-logos/dai.svg';
import IconEthLogo from 'ui/assets/chain-logos/eth.svg';
// import IconHecoLogo from 'ui/assets/chain-logos/heco.svg';
import IconPolygonLogo from 'ui/assets/chain-logos/polygon.svg';

export enum CHAINS_ENUM {
  ETH = 'ETH',
  BSC = 'BSC',
  DAI = 'DAI',
  HECO = 'HECO',
  POLYGON = 'POLYGON',
  FTM = 'FTM',
}

export const CHAINS: Record<string, Chain> = {
  [CHAINS_ENUM.ETH]: {
    id: 1,
    serverId: 'eth',
    name: 'Ethereum',
    hex: '0x1',
    enum: CHAINS_ENUM.ETH,
    logo: IconEthLogo,
    network: 1,
  },
  [CHAINS_ENUM.BSC]: {
    id: 56,
    name: 'BSC',
    serverId: 'bsc',
    hex: '0x38',
    enum: CHAINS_ENUM.BSC,
    logo: IconBscLogo,
    network: 56,
  },
  [CHAINS_ENUM.DAI]: {
    id: 100,
    name: 'XDAI',
    serverId: 'xdai',
    hex: '0x64',
    enum: CHAINS_ENUM.DAI,
    logo: IconDaiLogo,
    network: 100,
  },
  [CHAINS_ENUM.FTM]: {
    id: 250,
    serverId: 'ftm',
    name: 'Fantom',
    hex: '0xfa',
    enum: CHAINS_ENUM.FTM,
    logo:
      'https://static.debank.com/image/chain/logo_url/ftm/700fca32e0ee6811686d72b99cc67713.png',
    network: 250,
  },
  [CHAINS_ENUM.POLYGON]: {
    id: 137,
    serverId: 'matic',
    name: 'Polygon',
    hex: '0x89',
    enum: CHAINS_ENUM.POLYGON,
    logo: IconPolygonLogo,
    network: 137,
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
