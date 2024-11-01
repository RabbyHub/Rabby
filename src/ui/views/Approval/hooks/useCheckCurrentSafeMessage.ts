import { KEYRING_TYPE } from '@/constant';
import { useWallet } from '@/ui/utils';
import { SafeMessage } from '@safe-global/api-kit';
import { useRequest } from 'ahooks';
import type { Options } from 'ahooks/lib/useRequest/src/types';
import { useTranslation } from 'react-i18next';

export const useCheckCurrentSafeMessage = (
  {
    chainId,
    safeMessageHash,
    threshold,
  }: {
    chainId?: number;
    safeMessageHash?: string;
    threshold?: number;
  },
  options?: Options<
    | { safeMessage: SafeMessage; threshold: number; isFinished: boolean }
    | undefined,
    any
  >
) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  return useRequest(
    async () => {
      const currentAccount = (await wallet.getCurrentAccount())!;
      if (
        !threshold ||
        !chainId ||
        !safeMessageHash ||
        currentAccount.type !== KEYRING_TYPE.GnosisKeyring
      ) {
        return;
      }
      const res = await wallet.getGnosisMessage({
        chainId: chainId,
        messageHash: safeMessageHash,
      });
      if (res.confirmations.length >= threshold) {
        return {
          safeMessage: res,
          threshold,
          isFinished: true,
        };
      }
      return {
        safeMessage: res,
        threshold,
        isFinished: false,
      };
    },
    {
      refreshDeps: [chainId, threshold, safeMessageHash],
      ...options,
    }
  );
};
