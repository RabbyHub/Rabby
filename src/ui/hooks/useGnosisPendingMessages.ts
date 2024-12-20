import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { useWallet } from '../utils';

export const useGnosisPendingMessages = (
  params: { address?: string },
  options?: Options<
    Awaited<
      ReturnType<ReturnType<typeof useWallet>['getGnosisAllPendingMessages']>
    >,
    any[]
  >
) => {
  const { address } = params;
  const wallet = useWallet();
  return useRequest(
    async () => {
      if (address) {
        return wallet.getGnosisAllPendingMessages(address);
      }
      return null;
    },
    {
      refreshDeps: [address],
      cacheKey: `useGnosisPendingMessages-${address}`,
      staleTime: 500,
      ...options,
    }
  );
};
