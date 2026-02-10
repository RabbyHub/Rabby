import React from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as IconDotCC } from '@/ui/assets/new-user-import/dot-cc.svg';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import { useAsync } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { ReactComponent as RcIconTips } from '@/ui/assets/new-user-import/tips.svg';
import { PasswordCard } from './PasswordCard';
import { useMemoizedFn, useMount } from 'ahooks';
import { useRabbyDispatch } from '@/ui/store';
import { KEYRING_CLASS } from '@/constant';

export const CreateSeedPhrase = () => {
  const { t } = useTranslation();

  const history = useHistory();

  const { setStore } = useNewUserGuideStore();

  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const handleSubmit = useMemoizedFn(async (password: string) => {
    try {
      await wallet.boot(password);
      const seedPhrase = await wallet.generateMnemonic();
      await wallet.createKeyringWithMnemonics(seedPhrase, { hasBackup: false });
      const keyring = await wallet.getKeyringByMnemonic(seedPhrase, '');
      setStore({ seedPhrase, passphrase: '' });

      const stashKeyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
        keyring!.publicKey!
      );

      dispatch.importMnemonics.switchKeyring({
        stashKeyringId: stashKeyringId as number,
      });

      const accounts = await dispatch.importMnemonics.getAccounts({
        start: 0,
        end: 1,
      });

      await dispatch.importMnemonics.setSelectedAccounts([accounts[0].address]);
      await dispatch.importMnemonics.confirmAllImportingAccountsAsync();

      history.push({
        pathname: '/new-user/success',
        search: `?hd=${
          KEYRING_CLASS.MNEMONIC
        }&keyringId=${stashKeyringId}&isCreated=${true}`,
      });
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  });

  const handleBack = useMemoizedFn(() => {
    if (history.length > 1) {
      history.goBack();
    } else {
      window.close();
    }
  });

  useMount(async () => {
    const isBooted = await wallet.isBooted();
    if (isBooted) {
      message.error('already set password, please click rabby popup');
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  });

  return <PasswordCard onBack={handleBack} onSubmit={handleSubmit} />;
};
