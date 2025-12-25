import { HARDWARE_KEYRING_TYPES, NEXT_KEYRING_ICONS } from '@/constant';
import { Card } from '@/ui/component/NewUserImport';
import { useWallet } from '@/ui/utils';
import { getImKeyFirstImKeyDevice } from '@/ui/utils/imKey';
import { useMemoizedFn, useMount, useRequest } from 'ahooks';
import { Button, message } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useHDWalletUnlockAndRedirect } from './hooks/useHardWareUnlockAddress';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';

const RcLogo = NEXT_KEYRING_ICONS[HARDWARE_KEYRING_TYPES.ImKey.type].rcLight;

export const NewUserImportImKey = () => {
  const { t } = useTranslation();
  const { store } = useNewUserGuideStore();
  const history = useHistory();
  const wallet = useWallet();
  const handleUnlock = useHDWalletUnlockAndRedirect(
    HARDWARE_KEYRING_TYPES.ImKey.type
  );

  const handleSubmit = useMemoizedFn(async () => {
    try {
      if (!store.password) {
        throw new Error('empty password');
      }

      await getImKeyFirstImKeyDevice();
      await wallet.authorizeImKeyHIDPermission();
      await handleUnlock();
    } catch (e) {
      console.error(e);
      message.error(e?.message || t('page.newAddress.hd.tooltip.disconnected'));
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
            {t('page.newAddress.imkey.title')}
          </h1>
        </header>
        <main>
          <ul
            className={clsx(
              'list-decimal list-inside ml-[70px]',
              'text-r-neutral-title1 text-[16px] font-medium leading-[140%] mb-[36px]'
            )}
          >
            <li>{t('page.dashboard.hd.imkey.doc1')}</li>
            <li>{t('page.dashboard.hd.imkey.doc2')}</li>
          </ul>
          <img src="/images/imkey-plug.svg" className="w-[240px] mx-auto" />
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
        {t('page.connect.connectBtn')}
      </Button>
    </Card>
  );
};
