import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useRabbyDispatch } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { query2obj } from '@/ui/utils/url';
import { useMemoizedFn, useMount } from 'ahooks';
import { message } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { PasswordCard } from './PasswordCard';
import qs from 'qs';

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

  const handleGnosis = useMemoizedFn(async (password: string) => {
    try {
      if (!store.gnosis?.address) {
        throw new Error('empty safe address');
      }
      await wallet.boot(password);
      await wallet.importGnosisAddress(
        store.gnosis.address,
        store.gnosis.chainList.map((item) => item.network)
      );
      history.push({
        pathname: '/new-user/success',
        search: qs.stringify({
          brand: KEYRING_TYPE.GnosisKeyring,
        }),
      });
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
    if (type === 'seed-phrase') {
      handleSeedPhrase(password);
    }

    if (type === 'gnosis-address') {
      handleGnosis(password);
    }

    if (
      ([
        KEYRING_CLASS.HARDWARE.TREZOR,
        KEYRING_CLASS.HARDWARE.ONEKEY,
        KEYRING_CLASS.HARDWARE.GRIDPLUS,
        KEYRING_CLASS.HARDWARE.LEDGER,
        KEYRING_CLASS.HARDWARE.KEYSTONE,
        KEYRING_CLASS.HARDWARE.BITBOX02,
      ] as string[]).includes(type)
    ) {
      setStore({
        password,
      });
      history.push(`/new-user/import/hardware/${type}`);
    }
    return;
  });

  const handleBack = useMemoizedFn(() => {
    if (history.length > 1) {
      history.goBack();
    } else {
      window.close();
    }
  });

  const step = useMemo(() => {
    return ([
      KEYRING_CLASS.HARDWARE.TREZOR,
      KEYRING_CLASS.HARDWARE.ONEKEY,
      KEYRING_CLASS.HARDWARE.GRIDPLUS,
      KEYRING_CLASS.HARDWARE.LEDGER,
      KEYRING_CLASS.HARDWARE.KEYSTONE,
    ] as string[]).includes(type)
      ? 1
      : 2;
  }, [type]);

  useMount(async () => {
    const isBooted = await wallet.isBooted();
    if (isBooted) {
      message.error('already set password, please click rabby popup');
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  });

  useMount(async () => {
    if (type === 'private-key' && !store.privateKey) {
      history.replace('/new-user/guide');
      return;
    }
    if (type === 'seed-phrase' && !store.seedPhrase) {
      history.replace('/new-user/guide');
      return;
    }

    if (type === 'gnosis-address' && !store.gnosis?.address) {
      history.replace('/new-user/guide');
      return;
    }
  });

  return (
    <PasswordCard step={step} onBack={handleBack} onSubmit={handleSubmit} />
  );
};
