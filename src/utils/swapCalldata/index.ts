import type { DecodeCalldataOptions, TxWithChainId } from './types';
import {
  decodeCalldata as decodeUniCalldata,
  getVersion as getUniVersion,
} from './uni';
import {
  decodeCalldata as decodeMagpieCalldata,
  getVersion as getMagpieVersion,
} from './magpie';

export { UniABI, MagpieABI } from './abi';
export { isSameAddress, NULL_ADDRESS } from './utils';
export type {
  DecodeCalldataOptions,
  DecodeCalldataResult,
  TxWithChainId,
} from './types';
export { CalldataDecodeError } from './errors';

export const getCalldataVersion = (dexId: string, tx: TxWithChainId) => {
  try {
    switch (dexId) {
      case 'Uniswap':
        return getUniVersion(tx);
      case 'Magpie':
        return getMagpieVersion(tx);
      default:
        return 'unknown';
    }
  } catch {
    // A malformed quote must still produce a diagnostic log.
    return 'unknown';
  }
};

export const decodeCalldata = (
  dexId: string,
  tx: TxWithChainId,
  options: DecodeCalldataOptions = {}
) => {
  switch (dexId) {
    case 'Uniswap':
      return decodeUniCalldata(tx, options);
    case 'Magpie':
      return decodeMagpieCalldata(tx, options);
    default:
      throw new Error(dexId + ' calldata decoder is not available locally');
  }
};
