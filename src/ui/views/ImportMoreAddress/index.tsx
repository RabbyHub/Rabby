import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form, Input, message } from 'antd';
import {
  StrayPageWithButton,
  MultiSelectAddressList,
  LoadingOverlay,
} from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { KEYRING_TYPE } from 'consts';
import Pagination from './components/Pagination';
import './style.less';
import { useMedia } from 'react-use';
import type { Account } from '@/background/service/preference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

const ImportMoreAddress = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const isWide = useMedia('(min-width: 401px)');

  const { keyringId, importedAddresses, draftIndexes } = useRabbySelector(
    (s) => ({
      keyringId: s.importMnemonics.stashKeyringId,
      importedAddresses: s.importMnemonics.importedAddresses,
      draftIndexes: s.importMnemonics.draftIndexes,
    })
  );

  const dispatch = useRabbyDispatch();

  const [accounts, setAccounts] = useState<any[]>([]);

  const otherPageIndexes = React.useMemo(() => {
    const indexes = new Set([...draftIndexes]);
    accounts.forEach((account) => {
      indexes.delete(account.index);
    });
    return indexes;
  }, [accounts, draftIndexes]);

  const handleSelectChange = (
    saccounts: { address: string; index: number }[]
  ) => {
    dispatch.importMnemonics.setField({
      draftIndexes: new Set([
        ...otherPageIndexes,
        ...saccounts.map((account) => account.index),
      ]),
    });
  };
  const selectedAccounts = React.useMemo(() => {
    return accounts.filter((item) => draftIndexes.has(item.index));
  }, [accounts, draftIndexes]);

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
      onSuccess(_accounts) {
        if (_accounts.length < 5) {
          throw new Error(
            t(
              'You need to make use your last account before you can add a new one'
            )
          );
        }
        setSpin(false);
        setAccounts(_accounts);
        dispatch.importMnemonics.putQuriedAccountsByIndex({
          accounts: _accounts,
        });
      },
      onError(err) {
        message.error('Please check the connection with your wallet');
        setSpin(false);
      },
    }
  );

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;

    if (!keyringId) return;

    (async () => {
      await dispatch.importMnemonics.getImportedAccountsAsync({ keyringId });

      if (!mountedRef.current) return;
      getAccounts(true);
    })();

    return () => {
      mountedRef.current = false;
      dispatch.importMnemonics.cleanUpImportedInfoAsync({ keyringId });
    };
  }, [keyringId]);

  const handlePageChange = async (page: number) => {
    const start = 5 * (page - 1);
    const end = 5 * (page - 1) + 5;
    await getAccounts(false, start, end);
    setCurrentPage(page);
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
        onSubmit={() => {
          dispatch.importMnemonics.setSelectedIndexes({
            indexes: [...draftIndexes],
          });

          history.replace({
            pathname: isPopup
              ? '/popup/import/mnemonics-confirm'
              : '/import/mnemonics-confirm',
            state: { backFromImportMoreAddress: true },
          });
        }}
        onBackClick={() => {
          history.replace({
            pathname: isPopup
              ? '/popup/import/mnemonics-confirm'
              : '/import/mnemonics-confirm',
            state: { backFromImportMoreAddress: true },
          });
        }}
        nextDisabled={draftIndexes.size === 0}
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
            {draftIndexes.size} {t('addresses selected')}
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
                importedAccounts={[...importedAddresses]}
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

export default ImportMoreAddress;
