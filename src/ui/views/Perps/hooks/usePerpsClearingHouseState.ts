import { useRequest } from 'ahooks';
import { getPerpsSDK } from '../sdkManager';
import { getCustomClearinghouseState } from '../../DesktopPerps/utils';

export const usePerpsClearHouseState = (params?: { address?: string }) => {
  const { address } = params || {};

  return useRequest(
    async () => {
      if (!address) {
        return null;
      }
      const res = await getCustomClearinghouseState(address);
      return res;
    },
    {
      refreshDeps: [address],
      ready: !!address,
      cacheKey: `perpsClearingHouseState-${address}`,
    }
  );
};
