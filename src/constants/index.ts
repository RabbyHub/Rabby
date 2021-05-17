import IconBscLogo from 'ui/assets/chain-logos/bsc.svg';
import IconDaiLogo from 'ui/assets/chain-logos/dai.svg';
import IconEthLogo from 'ui/assets/chain-logos/eth.svg';
import IconHecoLogo from 'ui/assets/chain-logos/heco.svg';
import IconPolygonLogo from 'ui/assets/chain-logos/polygon.svg';

export const APPROVAL_STATE = {
  LOCK: 0,
  UNLOCK: 1,
  CONNECT: 2,
  SIGN: 3,
  REQUEST: 4,
  END: 5,
};

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
    hex: '',
    enum: CHAINS_ENUM.BSC,
    logo: IconBscLogo,
  },
  [CHAINS_ENUM.DAI]: {
    id: 100,
    name: 'XDAI',
    hex: '',
    enum: CHAINS_ENUM.DAI,
    logo: IconDaiLogo,
  },
  [CHAINS_ENUM.HECO]: {
    id: 128,
    name: 'Heco',
    hex: '',
    enum: CHAINS_ENUM.HECO,
    logo: IconHecoLogo,
  },
};

export const KEYRING_TYPE = {
  'HD Key Tree': 'Mnemonics addresses',
  'Simple Key Pair': 'Private key addresses',
};
