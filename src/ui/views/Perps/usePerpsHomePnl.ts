import { useMemoizedFn } from 'ahooks';
import { useEffect, useState } from 'react';
import { getPerpsSDK } from './sdkManager';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

export const usePerpsHomePnl = () => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);

  const fetch = useMemoizedFn(async () => {
    const sdk = getPerpsSDK();
    const account = await wallet.getPerpsCurrentAccount();
    if (account?.address) {
      const res = await sdk.info.getClearingHouseState(account.address);
      if (res.assetPositions.length === 0 || !res?.assetPositions) {
        dispatch.perps.setHomePositionPnl({ pnl: 0, show: false });
      } else {
        const pnl = res.assetPositions.reduce((acc, asset) => {
          return acc + Number(asset.position.unrealizedPnl);
        }, 0);
        dispatch.perps.setHomePositionPnl({ pnl, show: true });
      }
    } else {
      dispatch.perps.setHomePositionPnl({ pnl: 0, show: false });
    }
  });

  useEffect(() => {
    fetch();
  }, []);

  return {
    perpsPositionInfo: perpsState.homePositionPnl,
  };
};
