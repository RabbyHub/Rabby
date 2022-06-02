import React, { useState, useRef, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import styled from 'styled-components';
import { sortBy } from 'lodash';
import { StrayPageWithButton } from 'ui/component';
import AddressItem from 'ui/component/AddressList/AddressItem';
import { useWallet, useWalletRequest } from 'ui/utils';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import { KEYRING_ICONS, WALLET_BRAND_CONTENT, KEYRING_TYPE } from 'consts';
import { IconImportSuccess } from 'ui/assets';
import ConfirmMnemonicsLogo from 'ui/assets/confirm-mnemonics.svg';
import { useMedia } from 'react-use';
import Mask from 'ui/assets/import-mask.png';
import IconArrowRight from 'ui/assets/import/import-arrow-right.svg';

import { message } from 'antd';
import { useRabbySelector } from '../store';

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
  const isWide = useMedia('(min-width: 401px)');
  const { state } = useLocation<{
    keyringId?: number | null;
  }>();

  const stashKeyringId = useRabbySelector(
    (s) => s.importMnemonics.stashKeyringId
  );

  const exKeyringId = state?.keyringId || stashKeyringId;
  const keyringIdRef = useRef<number | null | undefined>(exKeyringId);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<any[]>([]);
  const importedAddresses = React.useMemo(() => {
    return new Set(
      ...(importedAccounts || []).map((address) => address.toLowerCase())
    );
  }, [importedAccounts]);

  const wallet = useWallet();
  const [, setSpin] = useState(true);

  const [getAccounts] = useWalletRequest(
    async (firstFlag, start?, end?): Promise<Account[]> => {
      setSpin(true);
      return firstFlag
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getFirstPage',
            keyringIdRef.current ?? null
          )
        : end
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getAddresses',
            keyringIdRef.current ?? null,
            start,
            end
          )
        : await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getNextPage',
            keyringIdRef.current ?? null
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
      },
      onError(err) {
        message.error('Please check the connection with your wallet');
        setSpin(false);
      },
    }
  );

  useEffect(() => {
    (async () => {
      const _importedAccounts = await wallet.requestKeyring(
        KEYRING_TYPE.HdKeyring,
        'getAccounts',
        keyringIdRef.current
      );
      setImportedAccounts(_importedAccounts);
      getAccounts(true);
    })();

    return () => {
      wallet.requestKeyring(
        KEYRING_TYPE.HdKeyring,
        'cleanUp',
        keyringIdRef.current ?? null
      );
    };
  }, []);

  const importedIcon =
    KEYRING_ICONS[accounts[0]?.type] ||
    WALLET_BRAND_CONTENT[accounts[0]?.brandName]?.image;

  const handleGotoImportMoreAddress = React.useCallback(() => {
    history.push({
      // pathname: '/popup/import/select-address',
      pathname: '/popup/import/import-more-address',
      state: {
        keyring: KEYRING_TYPE.HdKeyring,
        keyringId: stashKeyringId,
        isMnemonics: true,
      },
    });
  }, [stashKeyringId]);

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      hasDivider
      NextButtonContent={t('OK')}
      onNextClick={async () => {
        await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'activeAccounts',
          stashKeyringId,
          accounts.map((acc) => acc.index)
        );
        await wallet.addKeyring(stashKeyringId);

        history.replace({
          pathname: isPopup ? '/popup/import/success' : '/import/success',
          state: {
            accounts: accounts.map((account) => ({
              // ...account,
              address: account.address,
              index: account.index,
              brandName: KEYRING_TYPE.HdKeyring,
              type: KEYRING_TYPE.HdKeyring,
            })),
            hasDivider: true,
            editing: true,
            showImportIcon: false,
            isMnemonics: true,
            importedAccount: true,
            importedLength: importedAccounts && importedAccounts?.length,
          },
        });
      }}
      footerFixed
      noPadding={isPopup}
      isScrollContainer={isPopup}
    >
      {isPopup &&
        (!isWide ? (
          <header className="create-new-header create-password-header h-[264px]">
            <img
              className="rabby-logo"
              src="/images/logo-gray.png"
              alt="rabby logo"
            />
            <img
              className="unlock-logo w-[100px] h-[100px] mx-auto"
              src={ConfirmMnemonicsLogo}
            />
            <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
              {t('Import the following address')}
            </p>
            <img src="/images/success-mask.png" className="mask" />
          </header>
        ) : (
          <div className="create-new-header create-password-header h-[220px]">
            <div className="rabby-container">
              <img
                className="unlock-logo w-[100px] h-[100px] mx-auto"
                src={ConfirmMnemonicsLogo}
              />
              <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
                {t('Import the following address')}
              </p>
            </div>
            <img src={Mask} className="mask" />
          </div>
        ))}
      <div className={clsx(isPopup && 'rabby-container', 'overflow-auto')}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            // setStopEditing(true);
          }}
          className={clsx(
            'flex flex-col lg:justify-center text-center lg:h-auto',
            {
              'flex-1': isPopup,
              // 'overflow-auto': isPopup,
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
                  values={{ count: accounts?.length }}
                />
              </div>
            </>
          )}
          <AddressWrapper
            className={clsx(
              'pt-20 confirm-mnemonics',
              !isPopup && 'lg:h-[200px] lg:w-[460px]'
            )}
          >
            {sortBy(accounts, (item) => item?.index).map((account, index) => {
              // TODO: use imported to show
              const imported = importedAddresses.has(
                account.address.toLowerCase()
              );
              // TODO: replace `AddressItem` with new Component
              const editing = true;

              return (
                <AddressItem
                  className="mb-12 rounded bg-white pt-10 pb-14 pl-16 h-[62px] flex"
                  key={account.address}
                  account={account}
                  showAssets
                  icon={importedIcon}
                  showImportIcon={false}
                  editing={editing}
                  index={index}
                  showIndex={!editing}
                  importedAccount
                  isMnemonics={true}
                  // importedLength={importedLength}
                  // stopEditing={stopEditing || index !== editIndex}
                  // canEditing={(editing) => startEdit(editing, index)}
                  // ref={(el) => {
                  //   addressItems.current[index] = el;
                  // }}
                />
              );
            })}
          </AddressWrapper>
          <div className="mt-12 flex items-center justify-end">
            <span
              style={{ color: '#8697ff ' }}
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
