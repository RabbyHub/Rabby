import { useRequest } from 'ahooks';
import { getPerpsSDK } from '../sdkManager';

export const usePerpsClearHouseState = (params?: { address?: string }) => {
  const { address } = params || {};

  return useRequest(
    async () => {
      if (!address) {
        return null;
      }
      const sdk = getPerpsSDK();
      const res = await sdk.info.getClearingHouseState(address);
      return res;
    },
    {
      refreshDeps: [address],
      ready: !!address,
      cacheKey: `perpsClearingHouseState-${address}`,
    }
  );
};
