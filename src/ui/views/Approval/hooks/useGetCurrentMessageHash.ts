import { Account } from '@/background/service/preference';
import { KEYRING_TYPE } from '@/constant';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';

export const useGetMessageHash = ({
  chainId,
  message,
  account: currentAccount,
}: {
  chainId?: number;
  message?: string | Record<string, any> | null;
  account: Account;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  return useRequest(
    async () => {
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
      refreshDeps: [chainId, message, currentAccount],
    }
  );
};
