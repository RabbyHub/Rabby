import { KEYRING_TYPE } from '@/constant';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';

export const useGetMessageHash = ({
  chainId,
  message,
}: {
  chainId?: number;
  message?: string | Record<string, any> | null;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  return useRequest(
    async () => {
      const currentAccount = (await wallet.getCurrentAccount())!;
      if (
        !chainId ||
        !message ||
        currentAccount.type !== KEYRING_TYPE.GnosisKeyring
      ) {
        return;
      }
      return wallet.getGnosisMessageHash({
        safeAddress: currentAccount.address,
        chainId,
        message,
      });
    },
    {
      refreshDeps: [chainId, message],
    }
  );
};
