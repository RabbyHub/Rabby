import React, { useMemo } from 'react';
import { Card } from '@/ui/component/NewUserImport';
import { useHistory, useParams } from 'react-router-dom';
import {
  KEYRING_CLASS,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from 'antd';
import clsx from 'clsx';
import { useAsyncFn } from 'react-use';
import { useHDWalletUnlockAndRedirect } from './hooks/useHardWareUnlockAddress';
import { useMount } from 'ahooks';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';

export const NewUserImportHardware = () => {
  const { type } = useParams<{
    type: typeof KEYRING_CLASS.HARDWARE[keyof typeof KEYRING_CLASS.HARDWARE];
  }>();
  const history = useHistory();
  const { t } = useTranslation();
  const oneKeyTips = React.useMemo(
    () => [
      <Trans i18nKey="page.newUserImport.importOneKey.tip1" t={t}>
        1. Install
        <a
          className="ml-2 underline text-r-blue-default"
          href="https://onekey.so/download/?client=bridge"
          target="_blank"
          rel="noreferrer"
        >
          OneKey Bridge
        </a>
      </Trans>,
      t('page.newUserImport.importOneKey.tip2'),
      t('page.newUserImport.importOneKey.tip3'),
    ],
    [t]
  );

  const bitbox02Tips = React.useMemo(
    () => [
      <Trans i18nKey="page.newUserImport.importBitBox02.tip1" t={t}>
        1. Install the
        <a
          className="ml-2 underline text-r-blue-default"
          href="https://bitbox.swiss/download/#bridge"
          target="_blank"
          rel="noreferrer"
        >
          BitBoxBridge
        </a>
      </Trans>,
      t('page.newUserImport.importBitBox02.tip2'),
      t('page.newUserImport.importBitBox02.tip3'),
    ],
    [t]
  );

  const trezorTips = React.useMemo(
    () => [
      t('page.newUserImport.importTrezor.tip1'),
      t('page.newUserImport.importTrezor.tip2'),
    ],
    [t]
  );

  const gridPlusTips = React.useMemo(
    () => [
      t('page.newUserImport.ImportGridPlus.tip1'),
      t('page.newUserImport.ImportGridPlus.tip2'),
    ],
    [t]
  );

  const tips = React.useMemo(() => {
    switch (type) {
      case KEYRING_CLASS.HARDWARE.ONEKEY:
        return oneKeyTips;
      case KEYRING_CLASS.HARDWARE.TREZOR:
        return trezorTips;
      case KEYRING_CLASS.HARDWARE.GRIDPLUS:
        return gridPlusTips;
      case KEYRING_CLASS.HARDWARE.BITBOX02:
        return bitbox02Tips;
      default:
        return [];
    }
  }, [type, oneKeyTips, trezorTips, gridPlusTips, bitbox02Tips]);

  const title = useMemo(() => {
    switch (type) {
      case KEYRING_CLASS.HARDWARE.ONEKEY:
        return t('page.newUserImport.importOneKey.title');
      case KEYRING_CLASS.HARDWARE.TREZOR:
        return t('page.newUserImport.importTrezor.title');
      case KEYRING_CLASS.HARDWARE.GRIDPLUS:
        return t('page.newUserImport.ImportGridPlus.title');
      case KEYRING_CLASS.HARDWARE.BITBOX02:
        return t('page.newUserImport.importBitBox02.title');
      default:
        return '';
    }
  }, [type, t]);

  const buttonText = useMemo(() => {
    switch (type) {
      case KEYRING_CLASS.HARDWARE.ONEKEY:
        return t('page.newUserImport.importOneKey.connect');
      case KEYRING_CLASS.HARDWARE.TREZOR:
        return t('page.newUserImport.importTrezor.connect');
      case KEYRING_CLASS.HARDWARE.GRIDPLUS:
        return t('page.newUserImport.ImportGridPlus.connect');
      case KEYRING_CLASS.HARDWARE.BITBOX02:
        return t('page.newUserImport.importBitBox02.connect');
      default:
        return '';
    }
  }, [type, t]);

  const RcWalletIcon = useMemo(() => {
    switch (type) {
      case KEYRING_CLASS.HARDWARE.ONEKEY:
        return WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.ONEKEY].rcSvg;
      case KEYRING_CLASS.HARDWARE.TREZOR:
        return WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.TREZOR].rcSvg;
      case KEYRING_CLASS.HARDWARE.GRIDPLUS:
        return WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.GRIDPLUS].rcSvg;
      case KEYRING_CLASS.HARDWARE.BITBOX02:
        return WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.BITBOX02].rcSvg;
      default:
        return WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.ONEKEY].rcSvg;
    }
  }, [type]);

  const handle = useHDWalletUnlockAndRedirect(type);

  const [{ loading }, unlock] = useAsyncFn(handle, [handle]);

  const { store } = useNewUserGuideStore();

  useMount(async () => {
    if (!store.password) {
      history.replace('/new-user/guide');
    }
  });

  return (
    <Card
      step={2}
      onBack={() => {
        if (history.length) {
          history.goBack();
        } else {
          history.replace(`/new-user/import/${type}/set-password`);
        }
      }}
      className="flex flex-col justify-center"
    >
      <div className="mx-auto mt-[34px] mb-[16px] w-[52px] h-[52px] rounded-full overflow-hidden">
        <RcWalletIcon
          className="w-[52px] h-[52px] rounded-full"
          viewBox="0 0 28 28"
        />
      </div>
      <div className="text-24 font-medium text-r-neutral-title-1 text-center">
        {title}
      </div>
      <div className="mx-auto w-max flex flex-col mt-[20px]">
        {tips.map((tip, index) => (
          <div
            key={index}
            className="text-16 font-medium text-r-neutral-title-1"
          >
            {tip}
          </div>
        ))}
      </div>

      <Button
        onClick={unlock}
        block
        type="primary"
        loading={loading}
        className={clsx(
          'mt-[auto] h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        {buttonText}
      </Button>
    </Card>
  );
};
