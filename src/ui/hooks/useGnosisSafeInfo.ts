import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { useWallet } from '../utils';

export const useGnosisSafeInfo = (
  params: { address?: string; networkId?: string },
  options?: Options<BasicSafeInfo | undefined, any[]>
) => {
  const { address, networkId } = params;
  const wallet = useWallet();
  return useRequest(
    async () => {
      if (address && networkId) {
        const safeInfo = await wallet.getBasicSafeInfo({ address, networkId });

        return safeInfo;
      }
    },
    {
      refreshDeps: [address],
      cacheKey: `useGnosisSafeInfo-${address}-${networkId}`,
      ...options,
    }
  );
};
