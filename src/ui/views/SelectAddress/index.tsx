import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form, Input } from 'antd';
import { cloneDeep } from 'lodash';
import { StrayPageWithButton, MultiSelectAddressList } from 'ui/component';
import { useWallet } from 'ui/utils';
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
  const MultiSelectAddressRef = useRef<any>(null);
  const [selectedNumbers, setSelectedNumbers] = useState(0);
  const [end, setEnd] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');
  const loadedMap = useRef<
    Record<string, { address: string; index: number }[]>
  >({});

  const getAccounts = async (page: number) => {
    const arr: {
      address: string;
      index: number;
    }[] = cloneDeep(accounts);
    for (let i = (page - 1) * 10; i < page * 10; i++) {
      if (arr[i]) {
        continue;
      } else {
        arr[i] = { address: '', index: i + 1 };
      }
    }
    setAccounts(arr);
    const thisPage: { address: string; index: number }[] = [];
    for (let i = (page - 1) * 10; i < page * 10; i++) {
      thisPage.push(arr[i]);
    }
    if (thisPage.every((item) => item.address)) return;
    try {
      let _accounts: { address: string; index: number }[] = [];
      if (loadedMap.current[page]) {
        _accounts = loadedMap.current[page];
      } else {
        if (page === 1) {
          _accounts = await wallet.requestKeyring(
            keyring,
            'getFirstPage',
            keyringId.current
          );
        } else {
          _accounts = await wallet.requestKeyring(
            keyring,
            'getAddresses',
            keyringId.current,
            (page - 1) * 10,
            page * 10
          );
        }
        if (_accounts.length < 5) {
          throw new Error(
            t(
              'You need to make use your last account before you can add a new one'
            )
          );
        }
      }
      const tmp = cloneDeep(accounts);
      for (let i = 0; i < _accounts.length; i++) {
        tmp[_accounts[i].index - 1] = _accounts[i];
      }
      loadedMap.current[page] = _accounts;
      setAccounts(tmp);
    } catch (e) {
      console.log(e);
    }
  };

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

    getAccounts(1);
  };

  useEffect(() => {
    init();
    return () => {
      wallet.requestKeyring(keyring, 'cleanUp', keyringId.current);
    };
  }, []);

  useEffect(() => {
    if (accounts.length <= 0) return;
    if (accounts.length < end) {
      const length = accounts.length;
      const gap = end - length + 10;
      let current = 0;
      const tmp: { address: string; index: number }[] = [];
      while (current < gap) {
        tmp.push({ address: '', index: length + current + 1 });
        current++;
      }
      setAccounts([...accounts, ...tmp]);
    }
  }, [end]);

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
        importedAccount: true,
        importedLength: importedAccounts && importedAccounts?.length,
      },
    });
  };

  const startNumberConfirm = (e) => {
    e.preventDefault();
    if (end > 1000) {
      setErrorMsg(t('Max 1000'));
    } else {
      MultiSelectAddressRef.current.scrollTo(end);
    }
  };

  const toSpecificNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentNumber = parseInt(e.target.value);
    if (!currentNumber) {
      setErrorMsg(t('Invalid Number'));
      return;
    } else {
      setErrorMsg('');
      setEnd(Number(currentNumber));
    }
  };

  const handleLoadPage = async (page: number) => {
    await getAccounts(page);
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
        disableKeyDownEvent
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
          className={clsx('lg:h-[340px]', {
            'p-20': isPopup,
            'flex-1': isPopup,
          })}
        >
          <Form.Item className="mb-0" name="selectedAddressIndexes">
            {accounts.length > 0 && (
              <MultiSelectAddressList
                ref={MultiSelectAddressRef}
                accounts={accounts}
                importedAccounts={importedAccounts}
                type={keyring}
                changeSelectedNumbers={setSelectedNumbers}
                isPopup={isPopup}
                onLoadPage={handleLoadPage}
                loadMoreItems={(page: number) =>
                  accounts.length <= 1000 ? getAccounts(page) : null
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
