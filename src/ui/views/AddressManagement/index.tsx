import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { Menu, Dropdown, message } from 'antd';
import { FixedSizeList } from 'react-window';
import { KEYRING_TYPE } from 'consts';
import { useWallet, useWalletOld } from 'ui/utils';
import {
  PageHeader,
  AuthenticationModal,
  StrayFooter,
  Popup,
  Copy,
} from 'ui/component';
import AddressItem from './AddressItem';
import { DisplayedKeryring } from 'background/service/keyring';
import { Account } from 'background/service/preference';
import DisplayKeyring from 'background/service/keyring/display';
import IconPlusAddress from 'ui/assets/addAddress.png';
import IconHint from 'ui/assets/hint.png';
import IconSuccess from 'ui/assets/success.svg';
import IconStar from 'ui/assets/icon-star.svg';
import IconStarFill from 'ui/assets/icon-star-fill.svg';

import './style.less';
import { obj2query } from '@/ui/utils/url';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WalletConnectKeyring]: 4,
  [KEYRING_TYPE.WatchAddressKeyring]: 5,
};
const { Nav: StrayFooterNav } = StrayFooter;

const AddressManagement = () => {
  const wallet = useWalletOld();
  const { t } = useTranslation();
  const history = useHistory();

  // todo: store redesign
  const {
    accountsList,
    highlightedAddresses,
    loadingAddress,
  } = useRabbySelector((s) => ({
    ...s.viewDashboard,
  }));
  const { sortedAccountsList } = React.useMemo(() => {
    const restAccounts = [...accountsList];
    const highlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((addr) => {
      const idx = restAccounts.findIndex((account) => account.address === addr);
      if (idx > -1) {
        highlightedAccounts.push(restAccounts[idx]);
        restAccounts.splice(idx, 1);
      }
    });

    return {
      sortedAccountsList: highlightedAccounts.concat(restAccounts),
    };
  }, [accountsList, highlightedAddresses]);

  const noAccount = useMemo(() => {
    return sortedAccountsList.length <= 0 && !loadingAddress;
  }, [sortedAccountsList, loadingAddress]);

  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.viewDashboard.getHilightedAddressesAsync().then(() => {
      dispatch.viewDashboard.getAllAccountsToDisplay();
    });
  }, []);

  const fixedList = useRef<FixedSizeList>();

  const NoAddressUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-address.png"
        alt="no address"
      />
      <p className="text-gray-content text-14">{t('NoAddress')}</p>
      <Link
        to="/add-address"
        className="flex no-data-add-btn rounded-md text-15"
      >
        <img src={IconPlusAddress} className="w-[16px] h-[16px] mr-10" />
        {t('Add addresses')}
      </Link>
    </div>
  );

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const favorited = highlightedAddresses.has(account.address);

    return (
      <div className="address-wrap-with-padding" style={style}>
        <AddressItem
          address={account.address}
          type={account.type}
          brandName={account.brandName}
          alias={account.alianName}
          extra={
            <div
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                dispatch.viewDashboard.toggleHighlightedAddressAsync({
                  address: account.address,
                });
              }}
            >
              {favorited ? (
                <img src={IconStarFill} alt="" />
              ) : (
                <img src={IconStar} className="icon-star" alt="" />
              )}
            </div>
          }
          onClick={() => {
            history.push(
              `/settings/address-detail?${obj2query({
                address: account.address,
                type: account.type,
                brandName: account.brandName,
                byImport: account.byImport || '',
              })}`
            );
          }}
        />
      </div>
    );
  };

  return (
    <div className="page-address-management">
      <PageHeader>{t('Address Management')}</PageHeader>
      {noAccount ? (
        NoAddressUI
      ) : (
        <>
          <div className={'address-group-list management'}>
            <FixedSizeList
              height={500}
              width="100%"
              itemData={sortedAccountsList}
              itemCount={sortedAccountsList.length}
              itemSize={64}
              ref={fixedList}
              className="scroll-container"
            >
              {Row}
            </FixedSizeList>
          </div>
          <StrayFooterNav
            hasDivider
            onNextClick={() => {
              history.push('/add-address');
            }}
            NextButtonContent={
              <div className="flex items-center h-full justify-center text-15">
                <img
                  src={IconPlusAddress}
                  className="w-[16px] h-[16px] mr-10"
                />
                {t('Add Address')}
              </div>
            }
          />
        </>
      )}
    </div>
  );
};

export default AddressManagement;
