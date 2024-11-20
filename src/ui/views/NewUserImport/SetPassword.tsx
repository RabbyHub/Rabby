import { Card } from '@/ui/component/NewUserImport';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input, message } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { PasswordCard } from './PasswordCard';
import { useWallet } from '@/ui/utils';

export const NewUserSetPassword = () => {
  const { t } = useTranslation();
  const { store, setStore } = useNewUserGuideStore();
  const { type } = useParams<{ type: string }>();

  const history = useHistory();
  const wallet = useWallet();

  const handlePrivateKey = useMemoizedFn(async (password: string) => {
    try {
      if (!store.privateKey) {
        throw new Error('empty private key');
      }
      await wallet.boot(password);
      await wallet.importPrivateKey(store.privateKey);
      // todo
      history.push('/new-user/import-success');
    } catch (e) {
      console.error(e);
      message.error(e.message);
      throw e;
    }
  });

  const handleSubmit = useMemoizedFn(async (password: string) => {
    // todo different type
    if (type === 'private-key') {
      handlePrivateKey(password);
    }
  });

  return <PasswordCard onSubmit={handleSubmit} />;
};
