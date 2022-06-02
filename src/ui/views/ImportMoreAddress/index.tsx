import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form, Input, message, Select } from 'antd';
import {
  StrayPageWithButton,
  MultiSelectAddressList,
  LoadingOverlay,
} from 'ui/component';
import type { ISelectAccountItem } from 'ui/component/MultiSelectAddressList';
import { getUiType, useWallet, useWalletRequest } from 'ui/utils';
import { HARDWARE_KEYRING_TYPES, KEYRING_TYPE } from 'consts';
import { LEDGER_LIVE_PATH } from '../ImportHardware/LedgerHdPath';
import Pagination from './components/Pagination';
import './style.less';
import { useMedia } from 'react-use';
import type { Account } from '@/background/service/preference';

const { Option } = Select;

const SelectAddress = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');
  const { state } = useLocation<{
    keyringId?: number | null;
  }>();

  if (!state) {
    if (getUiType().isTab) {
      if (history.length) {
        history.goBack();
      } else {
        window.close();
      }
    } else {
      history.replace('/dashboard');
    }
    return null;
  }

  const {
    keyringId,
  } = state;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<any[]>([]);

  const wallet = useWallet();
  const [selectedAccounts, setSelectedAcounts] = useState<ISelectAccountItem[]>(
    []
  );

  const [end, setEnd] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [spinning, setSpin] = useState(true);

  const [getAccounts] = useWalletRequest(
    async (firstFlag, start?, end?): Promise<Account[]> => {
      setSpin(true);
      return firstFlag
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getFirstPage',
            keyringId ?? null
          )
        : end
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getAddresses',
            keyringId ?? null,
            start,
            end
          )
        : await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getNextPage',
            keyringId ?? null
          );
    },
    {
      onSuccess(_accounts, { args: [firstFlag] }) {
        if (_accounts.length < 5) {
          throw new Error(
            t(
              'You need to make use your last account before you can add a new one'
            )
          );
        }
        setSpin(false);
        setAccounts(_accounts);

        if (firstFlag && _accounts[0]) {
          setSelectedAcounts([
            {
              address: _accounts[0].address,
              index: _accounts[0].index as number,
            },
          ]);
        }
      },
      onError(err) {
        message.error('Please check the connection with your wallet');
        setSpin(false);
      },
    }
  );

  const init = async () => {
    const _importedAccounts = await wallet.requestKeyring(
      KEYRING_TYPE.HdKeyring,
      'getAccounts',
      keyringId
    );
    setImportedAccounts(_importedAccounts);
    getAccounts(true);
  };

  useEffect(() => {
    init();
    return () => {
      wallet.requestKeyring(KEYRING_TYPE.HdKeyring, 'cleanUp', keyringId ?? null);
    };
  }, []);

  const handleHDPathChange = async (v: string) => {
    await wallet.requestKeyring(
      KEYRING_TYPE.HdKeyring,
      'setHdPath',
      keyringId ?? null,
      v
    );
    getAccounts(true);
    setCurrentPage(1);
    setEnd(1);
  };

  const handlePageChange = async (page: number) => {
    const start = 5 * (page - 1);
    const end = 5 * (page - 1) + 5;
    await getAccounts(false, start, end);
    setCurrentPage(page);
  };

  const onSubmit = async () => {
    setSpin(true);
    const selectedIndexes = selectedAccounts.map((i) => i.index - 1);
    
    await wallet.requestKeyring(
      KEYRING_TYPE.HdKeyring,
      'activeAccounts',
      keyringId ?? null,
      selectedIndexes
    );
    await wallet.addKeyring(keyringId);

    setSpin(false);
    history.replace({
      pathname: isPopup ? '/popup/import/success' : '/import/success',
      state: {
        accounts: selectedAccounts.map((account) => ({
          ...account,
          brandName: KEYRING_TYPE.HdKeyring,
          type: KEYRING_TYPE.HdKeyring,
        })),
        hasDivider: true,
        editing: true,
        showImportIcon: false,
        importedAccount: true,
        importedLength: importedAccounts && importedAccounts?.length,
      },
    });
  };

  const startNumberConfirm: React.ComponentProps<
    typeof Input
  >['onPressEnter'] = (e) => {
    e.preventDefault();
    let page = 1;
    if (end % 5 === 0) {
      page = end / 5;
    } else {
      page = Math.floor(end / 5) + 1;
    }
    handlePageChange(page);
  };

  const toSpecificNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const currentNumber = parseInt(e.target.value);
    if (!currentNumber) {
      setEnd(0);
      return;
    } else {
      setErrorMsg(t(''));
      setEnd(Number(currentNumber));
    }
  };

  const handleSelectChange = (res: { address: string; index: number }[]) => {
    setSelectedAcounts(res);
  };

  return (
    <div className="impore-more-address">
      <StrayPageWithButton
        custom={isPopup && isWide}
        className={clsx(isPopup && isWide && 'rabby-stray-page')}
        header={
          isPopup
            ? undefined
            : {
              secondTitle: t('Select Addresses'),
              subTitle: t('Select the addresses you want to import'),
            }
        }
        headerClassName="mb-16"
        onSubmit={onSubmit}
        nextDisabled={selectedAccounts.length === 0}
        hasBack
        hasDivider
        footerFixed={false}
        noPadding={isPopup}
        disableKeyDownEvent
        isScrollContainer={isPopup}
      >
        {isPopup && (
          <header className="create-new-header import-more-address-header py-18 h-[80px]">
            <div className="rabby-container">
              <p className="text-20 mb-4 text-white text-center font-bold">
                {t('Import more address')}
              </p>
              <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
                {t('Select the addresses you want to import')}
              </p>
            </div>
          </header>
        )}
        <div
          className={clsx(
            'h-[40px] impore-more-address-wrapper flex',
            isPopup ? 'w-[400px]' : 'w-[460px]',
            'items-center'
          )}
        >
          <div className={clsx('flex items-center')}>
            <p className="pt-12">{t('Start from address')}</p>{' '}
            <Input
              className="ml-10"
              size="small"
              width={48}
              height={24}
              maxLength={6}
              onChange={toSpecificNumber}
              onPressEnter={startNumberConfirm}
              spellCheck={false}
              value={end}
            />
            {errorMsg && <p className="error-message pt-12">{errorMsg}</p>}
          </div>

          <div className="place-self-center">
            {selectedAccounts.length} {t('addresses selected')}
          </div>
        </div>
        <div className={clsx(isPopup && 'rabby-container')}>
          <div
            className={clsx('overflow-y-auto flex justify-center', {
              'p-20': isPopup,
              'flex-1': isPopup,
            })}
          >
            <Form.Item className="mb-0 flex-1">
              <MultiSelectAddressList
                accounts={accounts}
                importedAccounts={importedAccounts}
                type={KEYRING_TYPE.HdKeyring}
                value={selectedAccounts}
                onChange={handleSelectChange}
              />
            </Form.Item>
          </div>
        </div>
        <Pagination current={currentPage} onChange={handlePageChange} />
      </StrayPageWithButton>
      <LoadingOverlay hidden={!spinning} />
    </div>
  );
};

export default SelectAddress;
