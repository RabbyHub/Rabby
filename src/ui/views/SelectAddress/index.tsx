import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form } from 'antd';
import {
  StrayPageWithButton,
  MultiSelectAddressList,
  Spin,
} from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { HARDWARE_KEYRING_TYPES } from 'consts';
import { BIP44_PATH } from '../ImportHardware/LedgerHdPath';
import './style.less';

const SelectAddress = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const { state } = useLocation<{
    keyring: string;
    isMnemonics?: boolean;
    isWebUSB?: boolean;
    path?: string;
    keyringId?: number | null;
  }>();

  if (!state) {
    history.replace('/dashboard');
    return null;
  }

  const { keyring, isMnemonics, isWebUSB, path } = state;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<any[]>([]);
  const [form] = Form.useForm();
  const wallet = useWallet();
  const keyringId = useRef<number | null>(state.keyringId || null);

  const [getAccounts, loading] = useWalletRequest(
    async (firstFlag) => {
      return firstFlag
        ? await wallet.requestKeyring(
            keyring,
            'getFirstPage',
            keyringId.current
          )
        : await wallet.requestKeyring(
            keyring,
            'getNextPage',
            keyringId.current
          );
    },
    {
      onSuccess(_accounts) {
        if (_accounts.length < 5) {
          throw new Error(
            t(
              'You need to make use your last account before you can add a new one'
            )
          );
        }

        setAccounts(accounts.concat(..._accounts));
      },
      onError(err) {
        console.log('get hardware account error', err);
      },
    }
  );

  const init = async () => {
    if (keyringId.current === null || keyringId.current === undefined) {
      const stashKeyringId = await wallet.connectHardware({
        type: keyring,
        hdPath: path || BIP44_PATH,
        isWebUSB,
      });
      keyringId.current = stashKeyringId;
    }

    const _importedAccounts = await wallet.requestKeyring(
      keyring,
      'getAccounts',
      keyringId.current
    );
    setImportedAccounts(_importedAccounts);

    getAccounts(true);
  };

  useEffect(() => {
    init();
    return () => {
      wallet.requestKeyring(keyring, 'cleanUp', keyringId.current);
    };
  }, []);

  const onSubmit = async ({ selectedAddressIndexes }) => {
    if (isMnemonics) {
      await wallet.requestKeyring(
        keyring,
        'activeAccounts',
        keyringId.current,
        selectedAddressIndexes
      );
      await wallet.addKeyring(keyring);
    } else {
      await wallet.unlockHardwareAccount(
        keyring,
        selectedAddressIndexes,
        keyringId.current
      );
    }

    if (keyring === HARDWARE_KEYRING_TYPES.Ledger.type && isWebUSB) {
      await wallet.requestKeyring(keyring, 'cleanUp', keyringId.current);
    }

    history.replace({
      pathname: isPopup ? '/popup/import/success' : '/import/success',
      state: {
        accounts: selectedAddressIndexes.map((i) => accounts[i]),
        hasDivider: !!isMnemonics,
      },
    });
  };

  return (
    <div className="select-address">
      <StrayPageWithButton
        header={
          isPopup
            ? undefined
            : isMnemonics
            ? {
                secondTitle: t('Select Addresses'),
                subTitle: t('Select the addresses you want to import'),
              }
            : {
                title: t('Select Addresses'),
                subTitle: t('Select the addresses you want to import'),
                center: true,
              }
        }
        headerClassName="mb-16"
        onSubmit={onSubmit}
        hasBack
        hasDivider={isMnemonics}
        form={form}
        footerFixed={false}
        noPadding={isPopup}
        isScrollContainer={isPopup}
      >
        {isPopup && (
          <header className="create-new-header create-password-header h-[160px]">
            <img
              className="rabby-logo"
              src="/images/logo-gray.png"
              alt="rabby logo"
            />
            <p className="text-24 mb-4 mt-32 text-white text-center font-bold">
              {t('Select Addresses')}
            </p>
            <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
              {t('Select the addresses you want to import')}
            </p>
          </header>
        )}
        <div
          className={clsx('overflow-y-auto lg:h-[340px]', {
            'p-20': isPopup,
            'flex-1': isPopup,
          })}
        >
          <Form.Item className="mb-0" name="selectedAddressIndexes">
            <MultiSelectAddressList
              accounts={accounts}
              importedAccounts={importedAccounts}
            />
          </Form.Item>
        </div>
        <div
          onClick={() => getAccounts()}
          className="mt-24 text-blue-light text-15 text-center cursor-pointer"
        >
          {loading && <Spin size="small" />} {t('Load More')}
        </div>
      </StrayPageWithButton>
    </div>
  );
};

export default SelectAddress;
