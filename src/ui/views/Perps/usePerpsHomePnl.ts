import { useMemoizedFn } from 'ahooks';
import { useEffect, useState } from 'react';
import { getPerpsSDK } from './sdkManager';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

export const usePerpsHomePnl = () => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);
  const [isFetching, setIsFetching] = useState(false);

  const fetch = useMemoizedFn(async () => {
    setIsFetching(true);
    const sdk = getPerpsSDK();
    const account = await wallet.getPerpsCurrentAccount();
    if (account?.address) {
      const res = await sdk.info.getClearingHouseState(account.address);

      const positionAndOpenOrders = res.assetPositions.filter(
        (position) => position.position.leverage.type === 'isolated'
      );

      if (!positionAndOpenOrders || positionAndOpenOrders.length === 0) {
        dispatch.perps.setHomePositionPnl({ pnl: 0, show: false });
      } else {
        const pnl = positionAndOpenOrders.reduce((acc, asset) => {
          return acc + Number(asset.position.unrealizedPnl);
        }, 0);
        dispatch.perps.setHomePositionPnl({ pnl, show: true });
      }
    } else {
      dispatch.perps.setHomePositionPnl({ pnl: 0, show: false });
    }
    setIsFetching(false);
  });

  useEffect(() => {
    fetch();
  }, []);

  return {
    perpsPositionInfo: perpsState.homePositionPnl,
    isFetching,
  };
};
