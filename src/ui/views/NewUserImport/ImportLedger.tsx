import { Card } from '@/ui/component/NewUserImport';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { HARDWARE_KEYRING_TYPES, NEXT_KEYRING_ICONS } from '@/constant';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { useWallet } from '@/ui/utils';
import { InitAccounts } from '../HDManager/LedgerManager';

const RcLogo = NEXT_KEYRING_ICONS[HARDWARE_KEYRING_TYPES.Ledger.type].rcLight;

export const NewUserImportLedger = () => {
  const { t } = useTranslation();
  const { store, setStore } = useNewUserGuideStore();

  const history = useHistory();

  const [form] = Form.useForm<{
    privateKey: string;
  }>();

  const wallet = useWallet();

  const handleSubmit = useMemoizedFn(async () => {
    try {
      if (!store.password) {
        throw new Error('empty password');
      }

      await wallet.boot(store.password);
      const parent = window.opener;
      const transport = await TransportWebHID.create();
      await transport.close();
      await wallet.authorizeLedgerHIDPermission();

      if (parent) {
        window.postMessage({ success: true }, '*');
      } else {
        const keyringId = await wallet.connectHardware({
          type: HARDWARE_KEYRING_TYPES.Ledger.type,
          isWebHID: true,
          needUnlock: false,
        });

        const res = await wallet.requestKeyring(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          'getInitialAccounts',
          keyringId
        );
        const accounts = await wallet.unlockHardwareAccount(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          [0],
          keyringId
        );

        history.replace({
          pathname: '/import/success',
          state: {
            accounts,
            title: t('page.newAddress.importedSuccessfully'),
            editing: true,
            importedAccount: true,
            importedLength: accounts.length,
          },
        });

        // history.push('/new-user/import/private-key/set-password');
      }
    } catch (e) {
      console.error(e);
      if (parent) {
        window.postMessage({ success: false }, '*');
      }
      message.error(e.message);
    }
  });

  return (
    <Card
      onBack={() => {
        history.goBack();
        setStore({
          privateKey: undefined,
        });
      }}
      step={2}
      className="flex flex-col"
    >
      <div className="flex-1 mt-[18px]">
        <header className="mb-[20px]">
          <RcLogo
            className="w-[52px] h-[52px] mb-[16px] block mx-auto"
            viewBox="0 0 28 28"
          />
          <h1 className="text-r-neutral-title1 text-center text-[24px] font-semibold leading-[29px]">
            {'Ledger'}
          </h1>
        </header>
        <main>
          <ul
            className={clsx(
              'list-decimal list-inside ml-[70px]',
              'text-r-neutral-title1 text-[16px] font-medium leading-[140%] mb-[36px]'
            )}
          >
            <li>Plug in your Ledger device</li>
            <li>Enter your PIN to unlock.</li>
            <li>Open the Ethereum app.</li>
          </ul>
          <img src="/images/ledger-plug-1.png" className="w-[240px] mx-auto" />
        </main>
      </div>

      <Button
        onClick={handleSubmit}
        block
        type="primary"
        className={clsx(
          'mt-[24px] h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        Connect Ledger
      </Button>
    </Card>
  );
};
