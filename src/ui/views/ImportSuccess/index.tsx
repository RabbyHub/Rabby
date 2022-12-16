import React, { useState, useRef, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { sortBy } from 'lodash';
import { StrayPageWithButton } from 'ui/component';
import AddressItem from 'ui/component/AddressList/AddressItem';
import { getUiType } from 'ui/utils';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import stats from '@/stats';
import { KEYRING_ICONS, WALLET_BRAND_CONTENT, KEYRING_CLASS } from 'consts';
import { IconImportSuccess } from 'ui/assets';
import SuccessLogo from 'ui/assets/success-logo.svg';
import './index.less';
import { useMedia } from 'react-use';
import Mask from 'ui/assets/import-mask.png';
import { connectStore, useRabbyDispatch } from '@/ui/store';

const ImportSuccess = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { state } = useLocation<{
    accounts: Account[];
    hasDivider: boolean;
    title: string;
    brand?: string;
    image?: string;
    editing?: boolean;
    showImportIcon?: boolean;
    isMnemonics?: boolean;
    importedLength?: number;
  }>();
  const dispatch = useRabbyDispatch();
  const addressItems = useRef(new Array(state.accounts.length));
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)') && isPopup;
  const {
    accounts,
    hasDivider = true,
    title = t('Imported Successfully'),
    editing = false,
    showImportIcon = false,
    isMnemonics = false,
    importedLength = 0,
  } = state;

  const handleNextClick = async (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!stopEditing) {
      addressItems.current.forEach((item) => item.alianNameConfirm());
    }
    if (getUiType().isTab) {
      window.close();

      return;
    }
    history.push('/dashboard');
  };
  const importedIcon =
    KEYRING_ICONS[accounts[0].type] ||
    WALLET_BRAND_CONTENT[accounts[0].brandName]?.image;
  const [stopEditing, setStopEditing] = useState(true);
  const [editIndex, setEditIndex] = useState(0);
  const startEdit = (editing: boolean, index: number) => {
    if (editing) {
      setEditIndex(index);
      setStopEditing(false);
    } else {
      setStopEditing(true);
    }
  };

  useEffect(() => {
    if (Object.values(KEYRING_CLASS.HARDWARE).includes(accounts[0].type)) {
      stats.report('importHardware', {
        type: accounts[0].type,
      });
    }
    if (accounts[0]) {
      matomoRequestEvent({
        category: 'User',
        action: 'importAddress',
        label: accounts[0].type,
      });
    }

    dispatch.account.getCurrentAccountAsync();
  }, []);

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      hasDivider={hasDivider}
      NextButtonContent={t('Done')}
      onNextClick={handleNextClick}
      footerFixed={false}
      noPadding={isPopup}
      isScrollContainer={isPopup}
    >
      {isPopup &&
        (!isWide ? (
          <header className="create-new-header create-password-header h-[264px]">
            <img
              className="rabby-logo"
              src="/images/logo-white.svg"
              alt="rabby logo"
            />
            <img
              className="unlock-logo w-[128px] h-[128px] mx-auto"
              src={SuccessLogo}
            />
            <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
              {title || t('Imported Successfully')}
            </p>
            <img src="/images/success-mask.png" className="mask" />
          </header>
        ) : (
          <div className="create-new-header create-password-header h-[220px]">
            <div className="rabby-container">
              <img
                className="unlock-logo w-[128px] h-[128px] mx-auto"
                src={SuccessLogo}
              />
              <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
                {title || t('Imported Successfully')}
              </p>
            </div>
            <img src={Mask} className="mask" />
          </div>
        ))}
      <div className={clsx(isPopup && 'rabby-container', 'overflow-auto')}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setStopEditing(true);
          }}
          className={clsx(
            'flex flex-col lg:justify-center text-center h-[472px] lg:h-auto',
            {
              'flex-1': isPopup,
              'overflow-auto': isPopup,
              'px-20': isPopup,
            }
          )}
        >
          {!isPopup && (
            <>
              <img
                src={IconImportSuccess}
                className="mx-auto mb-18 w-[100px] h-[100px]"
              />
              <div className="text-green text-20 mb-2">{title}</div>
              <div className="text-title text-15 mb-12">
                <Trans
                  i18nKey="AddressCount"
                  values={{ count: accounts?.length }}
                />
              </div>
            </>
          )}
          <div
            className={clsx(
              'pt-20 success-import',
              !isPopup && 'lg:h-[200px] lg:w-[460px]'
            )}
          >
            {sortBy(accounts, (item) => item?.index).map((account, index) => (
              <AddressItem
                className="mb-12 rounded bg-white py-12 pl-16 h-[52px] flex"
                key={account.address}
                account={account}
                showAssets
                icon={importedIcon}
                showImportIcon={showImportIcon}
                editing={editing}
                index={index}
                showIndex={!editing}
                importedAccount
                isMnemonics={isMnemonics}
                importedLength={importedLength}
                stopEditing={stopEditing || index !== editIndex}
                canEditing={(editing) => startEdit(editing, index)}
                ref={(el) => {
                  addressItems.current[index] = el;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(ImportSuccess);
