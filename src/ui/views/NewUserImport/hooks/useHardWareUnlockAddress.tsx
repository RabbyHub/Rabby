import { KEYRING_CLASS } from '@/constant';
import { useNewUserGuideStore } from './useNewUserGuideStore';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

export const useHDWalletUnlockAndRedirect = (
  type: typeof KEYRING_CLASS.HARDWARE[keyof typeof KEYRING_CLASS.HARDWARE]
) => {
  const { t } = useTranslation();

  const { store, setStore } = useNewUserGuideStore();
  const wallet = useWallet();
  const idRef = React.useRef<number | null>(null);
  const history = useHistory();

  return React.useCallback(async () => {
    await wallet
      .connectHardware({
        type: type,
        isWebHID: true,
        // needUnlock: type === KEYRING_CLASS.HARDWARE.GRIDPLUS,
        needUnlock: true,
      })
      .then((id) => {
        idRef.current = id;
      })
      .catch((e) => {
        console.error(e);
        message.error({
          content: t('page.newAddress.hd.tooltip.disconnected'),
          key: 'ledger-error',
        });
      });

    try {
      const accounts = await wallet.requestKeyring(
        type,
        'getAddresses',
        idRef.current,
        0,
        1
      );

      if (accounts && accounts.length) {
        await wallet.boot(store.password);
        await wallet.unlockHardwareAccount(
          type,
          [accounts[0].index - 1],
          idRef.current
        );

        setStore({
          clearKeyringId: idRef.current!,
        });

        history.push({
          pathname: '/new-user/success',
          search: `?hd=${encodeURIComponent(type)}&keyringId=${idRef.current}`,
        });
      }
    } catch (error) {
      console.error(error);
      message.error({
        content: t('page.newAddress.hd.tooltip.disconnected'),
        key: 'ledger-error',
      });
    }
  }, [
    t,
    setStore,
    wallet?.connectHardware,
    wallet?.requestKeyring,
    wallet?.getAlianName,
    wallet?.boot,
    store?.password,
    wallet?.unlockHardwareAccount,
  ]);
};
