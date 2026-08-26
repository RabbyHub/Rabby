import BigNumber from 'bignumber.js';
import { __DEV__, appIsDebugPkg } from '@/utils/env';

export const SWAP_FEE_RATE = {
  DEFAULT: '0.25',
  HALF: '0.12',
  FREE: '0',
} as const;

export type SwapFeeRate = typeof SWAP_FEE_RATE[keyof typeof SWAP_FEE_RATE];

const useLowFeeThreshold = __DEV__ || appIsDebugPkg;
const SWAP_HALF_FEE_MIN_USD = useLowFeeThreshold ? 5 : 100_000;
const SWAP_FREE_FEE_MIN_USD = useLowFeeThreshold ? 10 : 1_000_000;
const FEE_THRESHOLD_TOLERANCE_USD = 0.005;

export const getRabbyFeeRate = ({
  payAmount,
  payTokenPrice,
  isFreeTokenPair,
  isWrapToken,
}: {
  payAmount: string;
  payTokenPrice: number;
  isFreeTokenPair: boolean;
  isWrapToken: boolean;
}): SwapFeeRate => {
  if (isWrapToken || isFreeTokenPair) {
    return SWAP_FEE_RATE.FREE;
  }

  const fromTokenUsdValue = new BigNumber(payAmount || 0).times(
    payTokenPrice || 0
  );
  if (
    fromTokenUsdValue.gte(
      new BigNumber(SWAP_FREE_FEE_MIN_USD).minus(FEE_THRESHOLD_TOLERANCE_USD)
    )
  ) {
    return SWAP_FEE_RATE.FREE;
  }
  if (
    fromTokenUsdValue.gte(
      new BigNumber(SWAP_HALF_FEE_MIN_USD).minus(FEE_THRESHOLD_TOLERANCE_USD)
    )
  ) {
    return SWAP_FEE_RATE.HALF;
  }
  return SWAP_FEE_RATE.DEFAULT;
};
