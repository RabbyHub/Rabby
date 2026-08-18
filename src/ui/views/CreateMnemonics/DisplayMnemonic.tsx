import React, { useEffect } from 'react';
import WordsMatrix from '@/ui/component/WordsMatrix';
import clsx from 'clsx';
import { connectStore } from 'ui/store';
import { useWallet } from 'ui/utils';
import { IconCopyCC } from 'ui/assets/component/IconCopyCC';
import IconSuccess from 'ui/assets/success.svg';
import { Button, message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { KEYRING_CLASS } from '@/constant';
import { useTranslation } from 'react-i18next';
import { Card } from '@/ui/component/NewUserImport';
import { useHistory } from 'react-router-dom';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useCreateMnemonicsStore } from '@/ui/state/createMnemonics';
import { useImportMnemonicsStore } from '@/ui/state/importMnemonics';

const DisplayMnemonic = () => {
  const wallet = useWallet();
  const mnemonics = useCreateMnemonicsStore((state) => state.mnemonics);
  const prepareMnemonicsAsync = useCreateMnemonicsStore(
    (state) => state.prepareMnemonicsAsync
  );
  const resetCreateMnemonics = useCreateMnemonicsStore((state) => state.reset);
  const stepTo = useCreateMnemonicsStore((state) => state.stepTo);
  useEffect(() => {
    prepareMnemonicsAsync();
  }, [prepareMnemonicsAsync]);
  const history = useHistory();
  const { t } = useTranslation();

  const onCopyMnemonics = React.useCallback(() => {
    copyTextToClipboard(mnemonics).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  }, [mnemonics]);

  const { isDarkTheme } = useThemeMode();

  const onSubmit = React.useCallback(async () => {
    await wallet.createKeyringWithMnemonics(mnemonics);

    // Passphrase is not supported on new creation
    const keyring = await wallet.getKeyringByMnemonic(mnemonics, '');
    const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
      keyring!.publicKey!
    );
    useImportMnemonicsStore.getState().switchKeyring({
      stashKeyringId: keyringId as number,
    });

    const accounts = await useImportMnemonicsStore.getState().getAccounts({
      start: 0,
      end: 1,
    });
    await useImportMnemonicsStore
      .getState()
      .setSelectedAccounts([accounts[0].address]);
    await useImportMnemonicsStore.getState().confirmAllImportingAccountsAsync();

    history.push({
      pathname: '/new-user/success',
      search: `?hd=${
        KEYRING_CLASS.MNEMONIC
      }&keyringId=${keyringId}&isCreated=${true}`,
    });
    resetCreateMnemonics();
  }, [mnemonics]);

  return (
    <Card onBack={() => stepTo('risk-check')} step={1}>
      <div className="mt-[18px] mb-[9px] text-[28px] font-medium text-r-neutral-title1 text-center">
        {t('page.newAddress.seedPhrase.backup')}
      </div>
      <div className="text-[16px] text-rabby-blue-default font-normal text-center mb-20 mx-[10px]">
        {t('page.newAddress.seedPhrase.backupTips')}
      </div>

      {mnemonics && (
        <WordsMatrix
          focusable={false}
          closable={false}
          words={mnemonics.split(' ')}
          className="bg-transparent"
        />
      )}

      <div
        className={clsx(
          'mx-auto mt-[24px] mb-[47px]',
          'cursor-pointer',
          'flex justify-center items-center gap-8',
          'text-14 font-medium text-rabby-blue-default',
          'hover:text-rabby-blue-default'
        )}
        onClick={onCopyMnemonics}
      >
        <IconCopyCC
          className="w-20 h-20 text-rabby-blue-default"
          strokeColor={isDarkTheme ? '#1C1F2BFF' : 'white'}
        />
        <span>{t('page.newAddress.seedPhrase.copy')}</span>
      </div>

      <Button
        onClick={onSubmit}
        block
        type="primary"
        className={clsx(
          'h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium bg-r-blue-default'
        )}
      >
        {t('page.newAddress.seedPhrase.saved')}
      </Button>
    </Card>
  );
};

export default connectStore()(DisplayMnemonic);
