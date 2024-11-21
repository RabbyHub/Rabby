import { DbkChainEntry } from './dbk-chain/Entry';
import { SonicEntry } from './sonic/Entry';

export const EcoChainMap = {
  [20240603]: {
    name: 'DBK Chain',
    logo:
      'https://static.debank.com/image/chain/logo_url/dbk/1255de5a9316fed901d14c069ac62f39.png',
    navBarClassName: 'bg-r-neutral-bg1',
    entry: DbkChainEntry,
  },
  [64165]: {
    name: 'Sonic Testnet',
    logo: 'https://soniclabs.com/images/chains/sonic-testnet.svg',
    navBarClassName: 'bg-r-sonic-background',
    entry: SonicEntry,
  },
};

export const EcoChains = Object.keys(EcoChainMap).map((key) => {
  return {
    id: Number(key),
    ...EcoChainMap[key],
  };
});
