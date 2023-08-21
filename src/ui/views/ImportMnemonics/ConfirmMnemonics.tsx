import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import styled from 'styled-components';
import { sortBy } from 'lodash';
import { StrayPageWithButton } from 'ui/component';
import DisplayAddressItem from './components/DisplayAddressItem';
import { useWalletRequest } from 'ui/utils';
import clsx from 'clsx';
import { KEYRING_TYPE } from 'consts';
import { IconImportSuccess } from 'ui/assets';
import ConfirmMnemonicsLogo from 'ui/assets/confirm-mnemonics.svg';
import IconArrowRight from 'ui/assets/import/import-arrow-right.svg';

import { message } from 'antd';
import {
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from '../../store';

const AddressWrapper = styled.div`
  & {
    overflow-y: auto;
  }
  &::-webkit-scrollbar {
    display: none;
  }
`;

const ConfirmMnemonics = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();

  const dispatch = useRabbyDispatch();
  const { confirmingAccounts, importedAddresses } = useRabbySelector((s) => ({
    confirmingAccounts: s.importMnemonics.confirmingAccounts,
    importedAddresses: s.importMnemonics.importedAddresses,
    stashKeyringId: s.importMnemonics.stashKeyringId,
  }));
  const accountsToImport = useRabbyGetter(
    (s) => s.importMnemonics.accountsToImport
  );

  const { state: { backFromImportMoreAddress } = {} } = useLocation<{
    backFromImportMoreAddress?: boolean;
  }>();

  const [getAccounts] = useWalletRequest(dispatch.importMnemonics.getAccounts, {
    onSuccess(accounts) {
      if (accounts.length < 5) {
        throw new Error(
          t(
            'You need to make use your last account before you can add a new one'
          )
        );
      }

      dispatch.importMnemonics.setSelectedAccounts([accounts[0].address]);
    },
    onError(err) {
      message.error('Please check the connection with your wallet');
    },
  });

  useEffect(() => {
    dispatch.importMnemonics.getImportedAccountsAsync();

    if (!backFromImportMoreAddress) {
      getAccounts({ firstFlag: true });
    }

    return () => {
      dispatch.importMnemonics.cleanUpImportedInfoAsync();
    };
  }, [backFromImportMoreAddress]);

  const handleGotoImportMoreAddress = React.useCallback(() => {
    dispatch.importMnemonics.beforeImportMoreAddresses();
    history.replace({
      pathname: '/popup/import/mnemonics-import-more-address',
    });
  }, []);

  const noAnyAccountsToImport = !accountsToImport.length;

  return (
    <StrayPageWithButton
      hasDivider
      onBackClick={() => {
        history.goBack();
      }}
      nextDisabled={noAnyAccountsToImport}
      NextButtonContent={t('Next')}
      onNextClick={async () => {
        await dispatch.importMnemonics.confirmAllImportingAccountsAsync();

        history.replace({
          pathname: isPopup ? '/popup/import/success' : '/import/success',
          state: {
            accounts: accountsToImport.map((account) => ({
              address: account.address,
              index: account.index,
              alianName: account.alianName,
              brandName: KEYRING_TYPE.HdKeyring,
              type: KEYRING_TYPE.HdKeyring,
            })),
            hasDivider: true,
            editing: true,
            showImportIcon: false,
            isMnemonics: true,
            importedAccount: true,
            importedLength: importedAddresses?.size,
          },
        });
      }}
      footerFixed
      noPadding={isPopup}
      isScrollContainer={isPopup}
    >
      {isPopup && (
        <header className="create-new-header create-password-header h-[234px]">
          <img
            className="rabby-logo"
            src="/images/logo-white.svg"
            alt="rabby logo"
          />
          <img
            className="w-[100px] h-[100px] mx-auto"
            src={ConfirmMnemonicsLogo}
          />
          <p className="text-24 mb-4 mt-0 text-white text-center font-bold absolute left-0 w-[100%] mx-auto bottom-[24px]">
            {t('Import the following address')}
          </p>
          <img src="/images/success-mask.png" className="mask" />
        </header>
      )}
      <div className={clsx(isPopup && 'rabby-container', 'overflow-auto')}>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={clsx(
            'flex flex-col lg:justify-center text-center lg:h-auto',
            {
              'flex-1': isPopup,
              'px-20': isPopup,
              'py-20': isPopup,
            }
          )}
        >
          {!isPopup && (
            <>
              <img
                src={IconImportSuccess}
                className="mx-auto mb-18 w-[100px] h-[100px]"
              />
              <div className="text-green text-20 mb-2">
                {t('Import the following address')}
              </div>
              <div className="text-title text-15 mb-12">
                <Trans
                  i18nKey="AddressCount"
                  values={{ count: confirmingAccounts?.length }}
                />
              </div>
            </>
          )}
          <AddressWrapper
            className={clsx(
              'confirm-mnemonics',
              !isPopup && 'lg:h-[200px] lg:w-[460px]'
            )}
          >
            {sortBy(confirmingAccounts, (item) => item?.index).map(
              (account) => {
                const imported = importedAddresses.has(
                  account.address.toLowerCase()
                );

                return (
                  <DisplayAddressItem
                    className="mb-12 rounded bg-white pt-14 pb-14 pl-12 pr-16 h-[52px] flex items-center"
                    key={account.address}
                    account={account}
                    imported={imported}
                  />
                );
              }
            )}
          </AddressWrapper>
          <div className="flex items-center justify-end">
            <span
              style={{ color: 'var(--blue-default, #7084ff)' }}
              className="cursor-pointer text-12 leading-14"
              onClick={handleGotoImportMoreAddress}
            >
              <span>{t('Import more address')}</span>
              <img className="inline-block" src={IconArrowRight} />
            </span>
          </div>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default ConfirmMnemonics;
