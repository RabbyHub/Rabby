import { HARDWARE_KEYRING_TYPES, NEXT_KEYRING_ICONS } from '@/constant';
import { Card } from '@/ui/component/NewUserImport';
import { useWallet } from '@/ui/utils';
import { LedgerHDPathType } from '@/ui/utils/ledger';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { useMemoizedFn, useMount, useRequest } from 'ahooks';
import { Button, message } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';

const RcLogo = NEXT_KEYRING_ICONS[HARDWARE_KEYRING_TYPES.Ledger.type].rcLight;

export const NewUserImportLedger = () => {
  const { t } = useTranslation();
  const { store, setStore } = useNewUserGuideStore();

  const history = useHistory();

  const wallet = useWallet();

  const handleSubmit = useMemoizedFn(async () => {
    try {
      if (!store.password) {
        throw new Error('empty password');
      }

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

        await wallet.requestKeyring(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          'setHDPathType',
          keyringId,
          LedgerHDPathType.LedgerLive
        );
        await wallet.boot(store.password);
        await wallet.unlockHardwareAccount(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          [0],
          keyringId
        );

        history.push({
          pathname: '/new-user/success',
          search: `?hd=${HARDWARE_KEYRING_TYPES.Ledger.type}&keyringId=${keyringId}`,
        });
      }
    } catch (e) {
      console.error(e);
      if (parent) {
        window.postMessage({ success: false }, '*');
      }
      message.error(e.message);
    }
  });

  const { runAsync: runHandleSubmit, loading } = useRequest(handleSubmit, {
    manual: true,
  });

  useMount(async () => {
    if (!store.password) {
      history.replace('/new-user/guide');
    }
  });

  return (
    <Card
      onBack={() => {
        history.goBack();
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
            {t('page.newUserImport.importLedger.title')}
          </h1>
        </header>
        <main>
          <ul
            className={clsx(
              'list-decimal list-inside ml-[70px]',
              'text-r-neutral-title1 text-[16px] font-medium leading-[140%] mb-[36px]'
            )}
          >
            <li>{t('page.newUserImport.importLedger.tip1')}</li>
            <li>{t('page.newUserImport.importLedger.tip2')}</li>
            <li>{t('page.newUserImport.importLedger.tip3')}</li>
          </ul>
          <img src="/images/ledger-plug-1.png" className="w-[240px] mx-auto" />
        </main>
      </div>

      <Button
        onClick={runHandleSubmit}
        block
        loading={loading}
        type="primary"
        className={clsx(
          'mt-[24px] h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        {t('page.newUserImport.importLedger.connect')}
      </Button>
    </Card>
  );
};
