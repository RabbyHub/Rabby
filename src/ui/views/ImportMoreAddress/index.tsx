import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Form, Input, message } from 'antd';
import {
  StrayPageWithButton,
  MultiSelectAddressList,
  LoadingOverlay,
  Navbar,
} from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { KEYRING_TYPE } from 'consts';
import Pagination from './components/Pagination';
import './style.less';
import { useMedia } from 'react-use';
import { useRabbyDispatch, useRabbyGetter, useRabbySelector } from '@/ui/store';

const ImportMoreAddress = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');

  const { importedAddresses, draftAddressSelection } = useRabbySelector(
    (s) => ({
      importedAddresses: s.importMnemonics.importedAddresses,
      draftAddressSelection: s.importMnemonics.draftAddressSelection,
    })
  );
  const countDraftSelected = useRabbyGetter(
    (s) => s.importMnemonics.countDraftSelected
  );

  const dispatch = useRabbyDispatch();

  const [accounts, setAccounts] = useState<any[]>([]);

  const otherPageAddresses = React.useMemo(() => {
    const addresses = new Set([...draftAddressSelection]);
    accounts.forEach((account) => {
      addresses.delete(account.address);
    });
    return addresses;
  }, [accounts, draftAddressSelection]);

  const handleSelectChange = (
    saccounts: { address: string; index: number }[]
  ) => {
    dispatch.importMnemonics.setField({
      draftAddressSelection: new Set(
        [
          ...otherPageAddresses,
          ...saccounts.map((account) => account.address),
        ].filter((v) => !importedAddresses.has(v))
      ),
    });
  };
  const selectedAccounts = React.useMemo(() => {
    return accounts.filter((item) => draftAddressSelection.has(item.address));
  }, [accounts, draftAddressSelection]);

  const [end, setEnd] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [spinning, setSpin] = useState(true);

  const [getAccounts] = useWalletRequest(dispatch.importMnemonics.getAccounts, {
    onSuccess(accounts) {
      if (accounts.length < 5) {
        throw new Error(
          t(
            'You need to make use your last account before you can add a new one'
          )
        );
      }
      setSpin(false);
      setAccounts(accounts);
    },
    onError(err) {
      message.error('Please check the connection with your wallet');
      setSpin(false);
    },
  });

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      await dispatch.importMnemonics.getImportedAccountsAsync();

      if (!mountedRef.current) return;
      getAccounts({ firstFlag: true });
    })();

    return () => {
      mountedRef.current = false;
      dispatch.importMnemonics.cleanUpImportedInfoAsync();
    };
  }, []);

  const handlePageChange = async (page: number) => {
    const start = 5 * (page - 1);
    const end = 5 * (page - 1) + 5;
    await getAccounts({ start, end });
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
        onSubmit={async () => {
          await dispatch.importMnemonics.setSelectedAccounts([
            ...draftAddressSelection,
          ]);
          dispatch.importMnemonics.clearDraftAddresses();

          history.replace({
            pathname: isPopup
              ? '/popup/import/mnemonics-confirm'
              : '/import/mnemonics-confirm',
            state: { backFromImportMoreAddress: true },
          });
        }}
        onBackClick={() => {
          dispatch.importMnemonics.clearDraftAddresses();

          history.replace({
            pathname: isPopup
              ? '/popup/import/mnemonics-confirm'
              : '/import/mnemonics-confirm',
            state: { backFromImportMoreAddress: true },
          });
        }}
        nextDisabled={countDraftSelected === 0}
        hasDivider
        footerFixed={false}
        noPadding={isPopup}
        disableKeyDownEvent
        isScrollContainer={isPopup}
      >
        {isPopup && (
          <Navbar
            onBack={() => {
              dispatch.importMnemonics.clearDraftAddresses();

              history.replace({
                pathname: isPopup
                  ? '/popup/import/mnemonics-confirm'
                  : '/import/mnemonics-confirm',
                state: { backFromImportMoreAddress: true },
              });
            }}
            desc={t('Select the addresses you want to import')}
          >
            {t('Import more address')}
          </Navbar>
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
            {countDraftSelected} {t('addresses selected')}
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
