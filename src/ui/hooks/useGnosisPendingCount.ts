import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { sum } from 'lodash';
import { useWallet } from '../utils';

export const useGnosisPendingCount = (
  params: { address?: string },
  options?: Options<number | undefined | null, any[]>
) => {
  const { address } = params;
  const wallet = useWallet();
  return useRequest(
    async () => {
      if (address) {
        const res = await Promise.all([
          wallet.getGnosisAllPendingTxs(address),
          wallet.getGnosisAllPendingMessages(address),
        ]);
        return sum(res.map((item) => item?.total || 0));
      }
    },
    {
      refreshDeps: [address],
      cacheKey: `useGnosisPendingCount-${address}`,
      staleTime: 500,
      ...options,
    }
  );
};
