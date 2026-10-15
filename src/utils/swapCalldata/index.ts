import type { TxWithChainId } from './types';
import { decodeCalldata as decodeUniCalldata } from './uni';
import { decodeCalldata as decodeMagpieCalldata } from './magpie';

export { UniABI, MagpieABI } from './abi';
export { isSameAddress, NULL_ADDRESS } from './utils';
export type { DecodeCalldataResult, TxWithChainId } from './types';

export const decodeCalldata = (dexId: string, tx: TxWithChainId) => {
  switch (dexId) {
    case 'Uniswap':
      return decodeUniCalldata(tx);
    case 'Magpie':
      return decodeMagpieCalldata(tx);
    default:
      throw new Error(dexId + ' calldata decoder is not available locally');
  }
};
