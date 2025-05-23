import { Account } from '@/background/service/preference';
import { KEYRING_TYPE } from '@/constant';
import { account } from '@/ui/models/account';
import { useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { useRequest } from 'ahooks';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export const useGetCurrentSafeInfo = ({
  chainId,
  account: currentAccount,
}: {
  chainId?: number;
  account: Account;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  return useRequest(
    async () => {
      if (!chainId || currentAccount.type !== KEYRING_TYPE.GnosisKeyring) {
        return;
      }
      const networkId = '' + chainId;
      const chain = findChain({ id: chainId });
      try {
        const safeInfo = await wallet.getBasicSafeInfo({
          address: currentAccount.address,
          networkId,
        });
        return safeInfo;
      } catch (e) {
        let networkIds: string[] = [];
        try {
          networkIds = await wallet.getGnosisNetworkIds(currentAccount.address);
        } catch (e) {
          console.error(e);
        }
        if (!networkIds.includes(networkId)) {
          throw new Error(
            t('page.signTx.safeAddressNotSupportChain', [chain?.name])
          );
        } else {
          throw e;
        }
      }
    },
    {
      refreshDeps: [chainId, account],
      onError(e) {
        Modal.error({
          className: 'modal-support-darkmode',
          title: 'Error',
          content: e.message || JSON.stringify(e),
          closable: false,
          // onOk() {
          //   rejectApproval();
          // },
        });
      },
    }
  );
};
