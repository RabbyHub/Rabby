import { useMemo } from 'react';

import { ethers } from 'ethers';
import {
  Pool,
  PoolBundle,
  UiPoolDataProvider,
  WalletBalanceProvider,
} from '@aave/contract-helpers';

import { CustomMarket } from '../config/market';
import { getProviderByWallet } from '../utils/provider';
import { useWallet } from '@/ui/utils/WalletContext';
import {
  getMarketInfo,
  getMarketKey,
  getSelectedMarketInfo,
  useSelectedMarket,
} from './market';

const poolsMap = new Map<
  CustomMarket,
  {
    provider: ethers.providers.Web3Provider;
    uiPoolDataProvider: UiPoolDataProvider;
    walletBalanceProvider: WalletBalanceProvider;
    pool: Pool;
    poolBundle: PoolBundle;
  }
>();

const getCachePools = (
  wallet: ReturnType<typeof useWallet>,
  marketKey?: CustomMarket,
  account?: {
    address: string;
    type: string;
    brandName: string;
  }
) => {
  const { marketData: selectedMarketData, chainInfo } = getMarketInfo(
    marketKey
  );
  if (!marketKey || !selectedMarketData) {
    return undefined;
  }
  const existingPools = poolsMap.get(marketKey as CustomMarket);
  if (existingPools) {
    return existingPools;
  }

  const chainServerId = chainInfo?.serverId || '';
  if (!chainServerId || !selectedMarketData) {
    console.error('Failed to get chainId for market:', {
      marketKey,
      chainInfo,
      selectedMarketData: selectedMarketData?.chainId,
    });
    return undefined;
  }

  const provider = getProviderByWallet(wallet, chainServerId, account);
  const newPools = {
    provider,
    uiPoolDataProvider: new UiPoolDataProvider({
      uiPoolDataProviderAddress:
        selectedMarketData.addresses.UI_POOL_DATA_PROVIDER,
      provider,
      chainId: selectedMarketData.chainId,
    }),
    walletBalanceProvider: new WalletBalanceProvider({
      walletBalanceProviderAddress:
        selectedMarketData.addresses.WALLET_BALANCE_PROVIDER,
      provider,
    }),
    pool: new Pool(provider, {
      POOL: selectedMarketData.addresses.LENDING_POOL,
      REPAY_WITH_COLLATERAL_ADAPTER:
        selectedMarketData.addresses.REPAY_WITH_COLLATERAL_ADAPTER,
      SWAP_COLLATERAL_ADAPTER:
        selectedMarketData.addresses.SWAP_COLLATERAL_ADAPTER,
      WETH_GATEWAY: selectedMarketData.addresses.WETH_GATEWAY,
      L2_ENCODER: selectedMarketData.addresses.L2_ENCODER,
    }),
    poolBundle: new PoolBundle(provider, {
      POOL: selectedMarketData.addresses.LENDING_POOL,
      WETH_GATEWAY: selectedMarketData.addresses.WETH_GATEWAY,
      L2_ENCODER: selectedMarketData.addresses.L2_ENCODER,
    }),
  };
  poolsMap.set(marketKey as CustomMarket, newPools);
  return newPools;
};

export function getPools(
  wallet: ReturnType<typeof useWallet>,
  getMarketKeyFromContext?: () => CustomMarket,
  account?: {
    address: string;
    type: string;
    brandName: string;
  }
) {
  const marketKey = getMarketKey(getMarketKeyFromContext);
  const selectedMarketData = getSelectedMarketInfo(
    marketKey,
    getMarketKeyFromContext
  ).marketData;
  if (!marketKey || !selectedMarketData) {
    return undefined;
  }
  return getCachePools(wallet, marketKey, account);
}

export const usePoolDataProviderContract = () => {
  const { selectedMarketData, marketKey } = useSelectedMarket();
  const wallet = useWallet();

  const pools = useMemo(() => {
    if (!marketKey || !selectedMarketData) {
      return undefined;
    }
    return getCachePools(wallet, marketKey);
  }, [wallet, marketKey, selectedMarketData]);

  return {
    pools,
  };
};
