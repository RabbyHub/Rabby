import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { useWallet } from '../utils';
import Safe from '@rabby-wallet/gnosis-sdk';
import { KEYRING_CLASS } from '@/constant';
import { crossCompareOwners } from '../utils/gnosis';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/dist/api';

export const useGnosisSafeInfo = (
  params: { address?: string; networkId?: string },
  options?: Options<SafeInfo | null | undefined, any[]>
) => {
  const { address, networkId } = params;
  const wallet = useWallet();
  return useRequest(
    async () => {
      if (address && networkId) {
        const safeInfo = await Safe.getSafeInfo(address, networkId);
        // todo
        const owners = await wallet.getGnosisOwners(
          {
            address,
            type: KEYRING_CLASS.GNOSIS,
            brandName: KEYRING_CLASS.GNOSIS,
          },
          address,
          safeInfo.version,
          networkId
        );
        const comparedOwners = crossCompareOwners(safeInfo.owners, owners);
        return {
          ...safeInfo,
          owners: comparedOwners,
        };
      }
    },
    {
      refreshDeps: [address],
      cacheKey: `useGnosisSafeInfo-${address}-${networkId}`,
      ...options,
    }
  );
};
