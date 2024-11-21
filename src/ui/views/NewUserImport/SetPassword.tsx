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

  const config = {
    'private-key': {
      onSubmit: useMemoizedFn(async (password: string) => {
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
      }),
      step: 2,
      onBack: useMemoizedFn(() => {
        history.goBack();
      }),
    },
    'gnosis-address': {
      onSubmit: useMemoizedFn(async (password: string) => {
        try {
          if (!store.gnosis?.address) {
            throw new Error('empty safe address');
          }
          await wallet.boot(password);
          await wallet.importGnosisAddress(
            store.gnosis.address,
            store.gnosis.chainList.map((item) => item.network)
          );
          // todo
          history.push('/new-user/import-success');
        } catch (e) {
          console.error(e);
          message.error(e.message);
          throw e;
        }
      }),
      step: 1,
      onBack: useMemoizedFn(() => {
        history.goBack();
      }),
    },
    ledger: {
      onSubmit: useMemoizedFn((password: string) => {
        setStore({
          password,
        });
        history.push('/new-user/import/ledger');
      }),
      step: 1,
      onBack: useMemoizedFn(() => {
        history.goBack();
      }),
    },
    keystone: {
      onSubmit: useMemoizedFn((password: string) => {
        setStore({
          password,
        });
        history.push('/new-user/import/keystone');
      }),
      step: 1,
      onBack: useMemoizedFn(() => {
        history.goBack();
      }),
    },
  };

  const props = config[type];
  if (!props) {
    return null;
  }

  return <PasswordCard {...props} />;
};
