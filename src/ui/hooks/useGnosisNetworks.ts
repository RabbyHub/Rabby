import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { useWallet } from '../utils';

export const useGnosisNetworks = (
  params: { address?: string },
  options?: Options<string[] | undefined, any[]>
) => {
  const { address } = params;
  const wallet = useWallet();
  return useRequest(
    async () => {
      if (address) {
        return wallet.getGnosisNetworkIds(address);
      }
    },
    {
      refreshDeps: [address],
      cacheKey: `useGnosisNetworks-${address}`,
      ...options,
    }
  );
};
