import { MarketDataType } from '../../config/market';
import { SupportedChainId } from '../../utils/native';

export const DEFAULT_REPAY_WITH_COLLATERAL_SLIPPAGE = 100; // 1%

const REPAY_WITH_COLLATERAL_SUPPORTED_CHAINS = [
  SupportedChainId.ARBITRUM_ONE,
  SupportedChainId.AVALANCHE,
  SupportedChainId.BNB,
  SupportedChainId.GNOSIS_CHAIN,
  SupportedChainId.MAINNET,
  SupportedChainId.POLYGON,
  SupportedChainId.SEPOLIA,
];

export const isSupportRepayWithCollateral = (
  chainId: number,
  market?: MarketDataType
) => {
  const marketEnabledFeatures =
    market?.enabledFeatures?.collateralRepay &&
    market.addresses.REPAY_WITH_COLLATERAL_ADAPTER;

  return (
    REPAY_WITH_COLLATERAL_SUPPORTED_CHAINS.includes(
      chainId as SupportedChainId
    ) && !!marketEnabledFeatures
  );
};
