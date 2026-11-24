import { useRequest } from 'ahooks';
import { getPerpsSDK } from '../sdkManager';
import { getCustomClearinghouseState } from '../../DesktopPerps/utils';

export const usePerpsClearHouseState = (params?: {
  address?: string;
  type?: string;
  manual?: boolean;
}) => {
  const address = params?.address?.toLowerCase();
  const { type, manual } = params || {};

  return useRequest(
    async () => {
      if (!address) {
        return null;
      }
      const res = await getCustomClearinghouseState(address);
      return res;
    },
    {
      manual,
      refreshDeps: [address, type],
      ready: !!address,
      cacheKey: `perpsClearingHouseState-${address}-${type}`,
      // The home card reads its display cache from Dexie and always refreshes.
      getCache: manual ? () => undefined : undefined,
    }
  );
};
