import { useEffect, useState } from 'react';
import {
  WsActiveAssetCtx,
  WsActiveAssetData,
} from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';
import { writeLeverageToCache } from './useActiveAssetDataCache';

export const useActiveAssetSubscription = (coin: string, address?: string) => {
  const [activeAssetCtx, setActiveAssetCtx] = useState<
    WsActiveAssetCtx['ctx'] | null
  >(null);
  const [
    activeAssetData,
    setActiveAssetData,
  ] = useState<WsActiveAssetData | null>(null);

  useEffect(() => {
    // The detail page swaps `coin` in place — drop the previous coin's payload
    // so consumers never read one coin's data under another coin's name.
    setActiveAssetCtx(null);
    if (!coin) return;
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetCtx(coin, (data) => {
      setActiveAssetCtx(data.ctx);
    });
    return () => {
      unsubscribe();
    };
  }, [coin]);

  useEffect(() => {
    setActiveAssetData(null);
    if (!coin || !address) return;
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetData(
      coin,
      address,
      (data) => {
        setActiveAssetData(data);
        if (data?.leverage) {
          writeLeverageToCache(coin, address, data.leverage);
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [coin, address]);

  return { activeAssetCtx, activeAssetData };
};
