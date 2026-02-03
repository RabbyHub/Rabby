import { valueToBigNumber } from '@aave/math-utils';
import { DisplayPoolReserveInfo } from '../types';

export const getSupplyCapData = (asset: DisplayPoolReserveInfo) => {
  let supplyCapUsage: number = asset
    ? valueToBigNumber(asset.reserve.totalLiquidity)
        .dividedBy(asset.reserve.supplyCap)
        .toNumber() * 100
    : 0;
  supplyCapUsage = supplyCapUsage === Infinity ? 0 : supplyCapUsage;
  const supplyCapReached = supplyCapUsage >= 99.99;
  return { supplyCapUsage, supplyCapReached };
};

export const GHO_SYMBOL = 'GHO';

/**
 * List of markets where new GHO minting is available.
 * Note that his is different from markets where GHO is listed as a reserve.
 */
export const GHO_MINTING_MARKETS = [
  'proto_mainnet_v3',
  'fork_proto_mainnet_v3',
  'proto_sepolia_v3',
  'fork_proto_sepolia_v3',
];

interface GhoUtilMintingAvailableParams {
  symbol: string;
  currentMarket: string;
}
export const displayGhoForMintableMarket = ({
  symbol,
  currentMarket,
}: GhoUtilMintingAvailableParams): boolean => {
  return symbol === GHO_SYMBOL && GHO_MINTING_MARKETS.includes(currentMarket);
};
