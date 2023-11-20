import React from 'react';
import AuthenticationModalPromise from '../component/AuthenticationModal';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../utils';

export const useEnterPassphraseModal = (type: 'address' | 'publickey') => {
  const { t } = useTranslation();
  const wallet = useWallet();

  const invoke = React.useCallback(
    async (value?: string) => {
      let passphrase = '';

      if (!value) {
        return '';
      }

      const needPassphrase = await wallet.getMnemonicKeyringIfNeedPassphrase(
        type,
        value
      );
      passphrase = await wallet.getMnemonicKeyringPassphrase(type, value);

      if (!needPassphrase || passphrase) {
        return passphrase;
      }

      await AuthenticationModalPromise({
        confirmText: t('global.confirm'),
        cancelText: t('global.Cancel'),
        placeholder: t('page.manageAddress.enterThePassphrase'),
        title: t('page.manageAddress.enterPassphraseTitle'),
        async validationHandler(input) {
          passphrase = input;

          if (
            !(await wallet.checkPassphraseBelongToMnemonic(
              type,
              value,
              passphrase
            ))
          ) {
            throw new Error(t('page.manageAddress.passphraseError'));
          }
          return;
        },
      });

      return passphrase;
    },
    [type]
  );

  return invoke;
};
