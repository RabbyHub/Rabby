import BigNumber from 'bignumber.js';
import type { DecodeCalldataResult } from '../types';
import { isSameAddress } from '../utils';

const ARC_CHAIN_ID = 5042;
const ARC_USDC = '0x3600000000000000000000000000000000000000';
const ARC_NATIVE_SCALE = '1000000000000';

// Arc exposes one USDC balance as native (18 decimals) and ERC20 (6 decimals).
// Normalize both the asset and its amount together, after route aggregation.
// Tempo pathUSD is a real 6-decimal TIP20; it must retain its contract address.
export const normalizeUniAssets = (
  result: DecodeCalldataResult,
  chainId: number,
  native: string
): DecodeCalldataResult => {
  if (chainId !== ARC_CHAIN_ID || isSameAddress(native, ARC_USDC))
    return result;
  const nativeIn = isSameAddress(result.fromToken, ARC_USDC);
  const nativeOut = isSameAddress(result.toToken, ARC_USDC);
  return {
    ...result,
    ...(nativeIn
      ? {
          fromToken: native,
          fromTokenAmount: new BigNumber(result.fromTokenAmount)
            .times(ARC_NATIVE_SCALE)
            .toFixed(),
        }
      : {}),
    ...(nativeOut
      ? {
          toToken: native,
          minReceiveToTokenAmount: new BigNumber(result.minReceiveToTokenAmount)
            .times(ARC_NATIVE_SCALE)
            .toFixed(),
        }
      : {}),
  };
};
