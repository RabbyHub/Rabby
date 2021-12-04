import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form, Input } from 'antd';
import { StrayPageWithButton, MultiSelectAddressList } from 'ui/component';
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
  const keyringId = useRef<number | null | undefined>(state.keyringId);
  const [selectedNumbers, setSelectedNumbers] = useState(0);
  const [start, setStart] = useState(11);
  const [end, setEnd] = useState(1);
  const [loadLength, setLoadLength] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');
  const [canLoad, setCanLoad] = useState(true);
  const [getAccounts, loading] = useWalletRequest(
    async (firstFlag, start, end) => {
      setCanLoad(false);
      return firstFlag
        ? await wallet.requestKeyring(
            keyring,
            'getFirstPage',
            keyringId.current
          )
        : end
        ? await wallet.requestKeyring(
            keyring,
            'getAddresses',
            keyringId.current,
            start,
            end
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
        setCanLoad(true);
        setAccounts(accounts.concat(..._accounts));
        setStart(accounts.length);
        setLoadLength(_accounts.length);
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
    if (canLoad) {
      getAccounts(true);
    }
  };

  useEffect(() => {
    init();
    return () => {
      wallet.requestKeyring(keyring, 'cleanUp', keyringId.current);
    };
  }, []);
  useEffect(() => {
    setStart(accounts.length);
  }, [accounts]);
  const onSubmit = async ({ selectedAddressIndexes }) => {
    const selectedIndexes = selectedAddressIndexes.map((i) => i - 1);

    if (isMnemonics) {
      await wallet.requestKeyring(
        keyring,
        'activeAccounts',
        keyringId.current,
        selectedIndexes
      );
      await wallet.addKeyring(keyringId.current);
    } else {
      await wallet.unlockHardwareAccount(
        keyring,
        selectedIndexes,
        keyringId.current
      );
    }

    if (keyring === HARDWARE_KEYRING_TYPES.Ledger.type && isWebUSB) {
      await wallet.requestKeyring(keyring, 'cleanUp', keyringId.current);
    }

    history.replace({
      pathname: isPopup ? '/popup/import/success' : '/import/success',
      state: {
        accounts: selectedIndexes.map((i) => ({
          ...accounts[i],
          brandName: keyring,
          type: keyring,
        })),
        hasDivider: !!isMnemonics,
        editing: isPopup,
        showImportIcon: false,
        isMnemonics,
      },
    });
  };
  const startNumberConfirm = (e) => {
    e.stopPropagation();
    if (end > 1000) {
      setErrorMsg(t('Max 1000'));
    } else if (accounts.length <= end && canLoad) {
      getAccounts(false, start, end + 9);
    }
  };
  const toSpecificNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentNumber = parseInt(e.target.value);
    if (!currentNumber) {
      setErrorMsg(t('Invalid Number'));
      return;
    } else {
      setErrorMsg(t(''));
      setEnd(Number(currentNumber));
    }
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
                subTitle: t('Select the addresses to view in Rabby'),
                center: true,
              }
        }
        headerClassName="mb-16"
        onSubmit={onSubmit}
        nextDisabled={selectedNumbers === 0}
        hasBack
        hasDivider={isMnemonics}
        form={form}
        footerFixed={false}
        noPadding={isPopup}
        isScrollContainer={isPopup}
      >
        {isPopup && (
          <header className="create-new-header create-password-header h-[100px]">
            <p className="text-24 mb-4 text-white text-center font-bold">
              {t('Select Addresses')}
            </p>
            <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
              {t('Select the addresses you want to import')}
            </p>
          </header>
        )}
        <div
          className={clsx(
            'h-[40px] select-address-wrapper flex items-center',
            isPopup ? 'w-[400px]' : 'w-[460px] mb-20'
          )}
        >
          <div className={clsx('flex items-center')}>
            <p className="pt-12">{t('Start from address')}</p>{' '}
            <Input
              className="ml-10"
              size="small"
              width={48}
              height={24}
              maxLength={4}
              onChange={toSpecificNumber}
              onPressEnter={startNumberConfirm}
              spellCheck={false}
            />
            {errorMsg && <p className="error-message pt-12">{errorMsg}</p>}
          </div>

          <div className="place-self-center">
            {selectedNumbers} {t('addresses selected')}
          </div>
        </div>
        <div
          className={clsx('overflow-y-auto lg:h-[340px]', {
            'p-20': isPopup,
            'flex-1': isPopup,
          })}
        >
          <Form.Item className="mb-0" name="selectedAddressIndexes">
            {accounts.length > 0 && (
              <MultiSelectAddressList
                accounts={accounts}
                importedAccounts={importedAccounts}
                type={keyring}
                changeSelectedNumbers={setSelectedNumbers}
                end={end}
                loadLength={loadLength}
                loading={loading}
                isPopup={isPopup}
                loadMoreItems={() =>
                  accounts.length <= 1000 && canLoad
                    ? getAccounts(false, accounts.length, accounts.length + 9)
                    : null
                }
              />
            )}
          </Form.Item>
        </div>
      </StrayPageWithButton>
    </div>
  );
};

export default SelectAddress;
