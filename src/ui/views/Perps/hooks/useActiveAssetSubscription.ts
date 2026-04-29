import { useEffect, useState } from 'react';
import {
  WsActiveAssetCtx,
  WsActiveAssetData,
} from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';

export const useActiveAssetSubscription = (coin: string, address?: string) => {
  const [activeAssetCtx, setActiveAssetCtx] = useState<
    WsActiveAssetCtx['ctx'] | null
  >(null);
  const [
    activeAssetData,
    setActiveAssetData,
  ] = useState<WsActiveAssetData | null>(null);

  useEffect(() => {
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
    if (!coin || !address) return;
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetData(
      coin,
      address,
      (data) => {
        setActiveAssetData(data);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [coin, address]);

  return { activeAssetCtx, activeAssetData };
};
