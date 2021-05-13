export const APPROVAL_STATE = {
  LOCK: 0,
  UNLOCK: 1,
  CONNECT: 2,
  SIGN: 3,
  REQUEST: 4,
  END: 5,
};

export enum CHAINS_ENUM {
  ETH,
  BSC,
  DAI,
  HECO,
  POLYGON,
}

export const CHAINS = {
  [CHAINS_ENUM.ETH]: {
    id: 1,
    name: 'Ethereum',
    hex: '0x1',
  },
  [CHAINS_ENUM.BSC]: {
    id: 56,
    name: 'BSC',
  },
  [CHAINS_ENUM.DAI]: {
    id: 100,
    name: 'XDAI',
  },
  [CHAINS_ENUM.HECO]: {
    id: 128,
    name: 'Heco',
  },
};
