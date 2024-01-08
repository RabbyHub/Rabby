import React, { useState, useRef, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { sortBy } from 'lodash';
import { StrayPageWithButton } from 'ui/component';
import AddressItem from 'ui/component/AddressList/AddressItem';
import { getUiType, useApproval } from 'ui/utils';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import stats from '@/stats';
import {
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_CLASS,
  HardwareKeyrings,
} from 'consts';
import { IconImportSuccess } from 'ui/assets';
import SuccessLogo from 'ui/assets/success-logo.svg';
import './index.less';
import { useMedia } from 'react-use';
import { connectStore, useRabbyDispatch } from '@/ui/store';
import { Chain } from '@debank/common';

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
    supportChainList?: Chain[];
  }>();

  const dispatch = useRabbyDispatch();
  const addressItems = useRef(new Array(state.accounts.length));
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)') && isPopup;
  const {
    accounts,
    hasDivider = true,
    title = t('page.importSuccess.title'),
    editing = false,
    showImportIcon = false,
    isMnemonics = false,
    importedLength = 0,
  } = state;
  const [, resolveApproval] = useApproval();

  const handleNextClick = async (e: React.MouseEvent<HTMLElement>) => {
    e?.stopPropagation();
    if (!stopEditing) {
      addressItems.current.forEach((item) => item.alianNameConfirm());
    }
    if (getUiType().isTab) {
      window.close();

      return;
    }

    if (getUiType().isNotification) {
      resolveApproval();
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
    if (
      Object.values(KEYRING_CLASS.HARDWARE).includes(accounts[0].type as any)
    ) {
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
      NextButtonContent={t('global.Done')}
      onNextClick={handleNextClick}
      footerFixed={false}
      noPadding={isPopup}
      isScrollContainer={isPopup}
    >
      {isPopup &&
        (!isWide ? (
          <header className="create-new-header create-password-header h-[200px] dark:bg-r-blue-disable">
            <img
              className="w-[60px] h-[60px] mx-auto mb-[20px] mt-[-4px]"
              src={SuccessLogo}
            />
            <p className="text-20 mb-4 mt-0 text-white text-center font-bold">
              {title || t('page.importSuccess.title')}
            </p>
          </header>
        ) : (
          <div className="create-new-header create-password-header h-[200px] dark:bg-r-blue-disable">
            <div className="rabby-container">
              <img
                className="w-[80px] h-[80px] mx-auto mb-[16px] mt-[-4px]"
                src={SuccessLogo}
              />
              <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
                {title || t('page.importSuccess.title')}
              </p>
            </div>
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
                  i18nKey="page.importSuccess.addressCount"
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
                className="mb-12 rounded bg-r-neutral-card-1 py-12 pl-16 h-[92px] flex"
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
                stopEditing={!editing}
                canEditing={(editing) => startEdit(editing, index)}
                showEditIcon={false}
                ellipsis={false}
                ref={(el) => {
                  addressItems.current[index] = el;
                }}
              />
            ))}
            {!!state?.supportChainList?.length && (
              <div className="chain-list-container">
                <div className="desc">
                  {t('page.importSuccess.gnosisChainDesc', {
                    count: state?.supportChainList?.length || 0,
                  })}
                </div>
                <div className="chain-list">
                  {state?.supportChainList?.map((chain) => {
                    return (
                      <div className="chain-list-item" key={chain.id}>
                        <img src={chain.logo} alt="" className="chain-logo" />
                        {chain.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(ImportSuccess);
