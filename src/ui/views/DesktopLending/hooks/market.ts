import { useMemo } from 'react';

import { CHAINS_ENUM } from '@debank/common';
import { findChainByID } from '@/utils/chain';

import { CustomMarket, MarketDataType, marketsData } from '../config/market';
import { useLendingService } from './useLendingService';

export function getSelectedMarketInfo(
  marketKey?: CustomMarket,
  getMarketKeyFromContext?: () => CustomMarket
) {
  const market =
    marketKey || getMarketKeyFromContext?.() || CustomMarket.proto_mainnet_v3;
  return getMarketInfo(market);
}
export function getMarketKey(getMarketKeyFromContext?: () => CustomMarket) {
  return getMarketKeyFromContext?.() || CustomMarket.proto_mainnet_v3;
}

export const getMarketInfo = (market?: CustomMarket) => {
  const marketData: MarketDataType | undefined =
    !!market && marketsData[market as CustomMarket]
      ? marketsData[market as CustomMarket]
      : undefined;
  const chainEnum = marketData?.chainId
    ? findChainByID(marketData?.chainId)?.enum
    : undefined;
  const chainInfo = marketData?.chainId
    ? findChainByID(marketData?.chainId)
    : undefined;
  const isMainnet = chainEnum === CHAINS_ENUM.ETH;
  return {
    marketData,
    chainEnum,
    chainInfo,
    isMainnet,
  };
};

export const useSelectedMarket = () => {
  const { lastSelectedChain, setLastSelectedChain } = useLendingService();
  const { marketData, chainEnum, chainInfo, isMainnet } = useMemo(
    () => getMarketInfo(lastSelectedChain),
    [lastSelectedChain]
  );

  return {
    marketKey: lastSelectedChain,
    selectedMarketData: marketData,
    setMarketKey: setLastSelectedChain,
    chainEnum,
    chainInfo,
    isMainnet,
  };
};
