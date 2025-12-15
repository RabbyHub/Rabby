import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useRequest } from 'ahooks';
import { getPerpsSDK } from '../sdkManager';

export const usePerpsHomePnl = () => {
  const dispatch = useRabbyDispatch();
  const perpsState = useRabbySelector((state) => state.perps);
  const perpsAccount = perpsState.currentPerpsAccount;

  const { data, loading: isFetching } = useRequest(
    async () => {
      const sdk = getPerpsSDK();
      const account = perpsAccount;
      if (account?.address) {
        const res = await sdk.info.getClearingHouseState(account.address);

        return res;
      }
      return null;
    },
    {
      refreshDeps: [perpsAccount?.address],
    }
  );

  return {
    perpsPositionInfo: data,
    isFetching,
  };
};
