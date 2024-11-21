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
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useRabbyDispatch } from '@/ui/store';
import { obj2query, query2obj } from '@/ui/utils/url';

export const NewUserSetPassword = () => {
  const { t } = useTranslation();
  const { store, setStore } = useNewUserGuideStore();
  const { type } = useParams<{ type: string }>();

  const { search } = useLocation();
  const { isCreated = false } = React.useMemo(() => query2obj(search), [
    search,
  ]);

  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const config = {
    'seed-phrase': {
      onSubmit: (password: string) => {
        return handleSeedPhrase(password);
      },
    },
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
  const handlePrivateKey = useMemoizedFn(async (password: string) => {
    try {
      if (!store.privateKey) {
        throw new Error('empty private key');
      }
      await wallet.boot(password);
      await wallet.importPrivateKey(store.privateKey);
      history.push('/new-user/success');
    } catch (e) {
      console.error(e);
      message.error(e.message);
      throw e;
    }
  });

  const handleSeedPhrase = useMemoizedFn(async (password: string) => {
    try {
      if (!store.seedPhrase) {
        throw new Error('empty seed phrase');
      }
      await wallet.boot(password);
      let stashKeyringId: number | null = null;

      if (!isCreated) {
        const {
          keyringId,
          isExistedKR,
        } = await wallet.generateKeyringWithMnemonic(
          store.seedPhrase,
          store.passphrase || ''
        );

        dispatch.importMnemonics.switchKeyring({
          finalMnemonics: store.seedPhrase,
          passphrase: store.passphrase,
          isExistedKeyring: isExistedKR,
          stashKeyringId: keyringId,
        });
        stashKeyringId = keyringId;
      } else {
        await wallet.createKeyringWithMnemonics(store.seedPhrase);
        const keyring = await wallet.getKeyringByMnemonic(
          store.seedPhrase,
          store.passphrase
        );

        stashKeyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
          keyring!.publicKey!
        );
      }

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
        search: `?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${stashKeyringId}&isCreated=${isCreated}`,
      });
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  });

  const handleSubmit = useMemoizedFn(async (password: string) => {
    // todo different type
    if (type === 'private-key') {
      handlePrivateKey(password);
    }
    if (type === 'seed-phrase') {
      handleSeedPhrase(password);
    }

    if (
      ([
        KEYRING_CLASS.HARDWARE.TREZOR,
        KEYRING_CLASS.HARDWARE.ONEKEY,
        KEYRING_CLASS.HARDWARE.GRIDPLUS,
      ] as string[]).includes(type)
    )
      setStore({
        password,
      });
    history.push(`/new-user/import/hardware/${type}`);
    return;
  });

  return <PasswordCard {...props} />;
};
