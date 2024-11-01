import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { useWallet } from '../utils';

export const useSyncGnosisNetworks = (
  params: { address?: string },
  options?: Options<any, any[]>
) => {
  const { address } = params;
  const wallet = useWallet();
  return useRequest(
    async () => {
      console.log('address', address);
      if (address) {
        return wallet.syncGnosisNetworks(address);
      }
    },
    {
      refreshDeps: [address],
      cacheKey: `useSyncGnosisNetworks-${address}`,
      staleTime: 5 * 60 * 1000,
      ...options,
    }
  );
};
