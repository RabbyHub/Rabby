import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useRequest } from 'ahooks';
import { getPerpsSDK } from '../sdkManager';

export const usePerpsHomePnl = () => {
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);
  const perpsAccount = perpsState.currentPerpsAccount;

  console.log('perps', perpsState);

  const { loading: isFetching } = useRequest(
    async () => {
      const sdk = getPerpsSDK();
      const account = perpsAccount;
      if (account?.address) {
        const res = await sdk.info.getClearingHouseState(account.address);

        const positionAndOpenOrders = res.assetPositions;

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
    },
    {
      refreshDeps: [perpsAccount?.address],
    }
  );

  return {
    perpsPositionInfo: perpsState.homePositionPnl,
    isFetching,
  };
};
