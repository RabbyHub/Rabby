import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { VariableSizeList as VList } from 'react-window';
import { PageHeader } from 'ui/component';
import AddressItem from './AddressItem';
import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';

import './style.less';
import { obj2query } from '@/ui/utils/url';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { sortAccountsByBalance } from '@/ui/utils/account';
import clsx from 'clsx';
import { ReactComponent as IconAddAddress } from '@/ui/assets/address/new-address.svg';
import { ReactComponent as IconRefresh } from '@/ui/assets/address/refresh.svg';
import { ReactComponent as IconLoading } from '@/ui/assets/address/loading.svg';
import { ReactComponent as IconRight } from '@/ui/assets/address/right.svg';

import { groupBy } from 'lodash';
import { KEYRING_CLASS } from '@/constant';
import { Tooltip } from 'antd';
import { useRequest } from 'ahooks';
import { SessionStatusBar } from '@/ui/component/WalletConnect/SessionStatusBar';
import { LedgerStatusBar } from '@/ui/component/ConnectStatus/LedgerStatusBar';
import { GridPlusStatusBar } from '@/ui/component/ConnectStatus/GridPlusStatusBar';

import { Input } from 'antd';
import IconSearch from 'ui/assets/search.svg';

const AddressManagement = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const enableSwitch = location.pathname === '/switch-address';

  // todo: store redesign
  const {
    accountsList,
    highlightedAddresses = [],
    loadingAccounts,
  } = useRabbySelector((s) => ({
    ...s.accountToDisplay,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));

  const [sortedAccountsList, watchSortedAccountsList] = React.useMemo(() => {
    const restAccounts = [...accountsList];
    let highlightedAccounts: typeof accountsList = [];
    let watchModeHighlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((highlighted) => {
      const idx = restAccounts.findIndex(
        (account) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );
      if (idx > -1) {
        if (restAccounts[idx].type === KEYRING_CLASS.WATCH) {
          watchModeHighlightedAccounts.push(restAccounts[idx]);
        } else {
          highlightedAccounts.push(restAccounts[idx]);
        }
        restAccounts.splice(idx, 1);
      }
    });
    const data = groupBy(restAccounts, (e) =>
      e.type === KEYRING_CLASS.WATCH ? '1' : '0'
    );

    highlightedAccounts = sortAccountsByBalance(highlightedAccounts);
    watchModeHighlightedAccounts = sortAccountsByBalance(
      watchModeHighlightedAccounts
    );

    return [
      highlightedAccounts.concat(data['0'] || []).filter((e) => !!e),
      watchModeHighlightedAccounts.concat(data['1'] || []).filter((e) => !!e),
    ];
  }, [accountsList, highlightedAddresses]);

  const accountList = useMemo(
    () => [...(sortedAccountsList || []), ...(watchSortedAccountsList || [])],
    [sortedAccountsList, watchSortedAccountsList]
  );

  const noAccount = useMemo(() => {
    return accountList.length <= 0 && !loadingAccounts;
  }, [accountList, loadingAccounts]);

  const dispatch = useRabbyDispatch();

  const [searchVal, setSearchVal] = useState<string>('');

  const accountListFiltered = useMemo(() => {
    const results = accountList.filter((item) => {
      const res = `${item.address} ${item.alianName}`;
      return res.toLowerCase().includes(searchVal.toLowerCase());
    });
    return results;
  }, [searchVal, watchSortedAccountsList]);

  const noSearchResults = useMemo(() => {
    return accountListFiltered.length <= 0 && !loadingAccounts;
  }, [accountListFiltered, loadingAccounts]);

  const handleSearchValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchVal(e.target.value);
  };

  useEffect(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  }, []);

  const {
    runAsync: handleUpdateAllBalance,
    loading: isUpdateAllBalanceLoading,
  } = useRequest(() => dispatch.accountToDisplay.updateAllBalance(), {
    manual: true,
    // onError: (e) => {
    //   message.error('Update balance failed');
    // },
  });

  const NoAddressUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-address.png"
        alt="no address"
      />
      <p className="text-gray-content text-14">{t('NoAddress')}</p>
    </div>
  );

  const NoSearchResultUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-address.png"
        alt="no wallet found"
      />
      <p className="text-gray-content text-14">{t('NoWalletFound')}</p>
    </div>
  );

  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  const currentAccountIndex = useMemo(() => {
    if (!currentAccount || !enableSwitch) {
      return -1;
    }
    return accountList.findIndex((e) =>
      (['address', 'brandName', 'type'] as const).every(
        (key) => e[key]?.toLowerCase() === currentAccount[key]?.toLowerCase()
      )
    );
  }, [accountList, currentAccount, enableSwitch]);

  const gotoAddAddress = () => {
    history.push('/add-address');
  };

  const gotoManageAddress = () => {
    history.push('/settings/address');
  };

  const switchAccount = async (account: typeof sortedAccountsList[number]) => {
    await dispatch.account.changeAccountAsync(account);
    history.push('/dashboard');
  };

  useEffect(() => {
    dispatch.whitelist.init();
  }, []);

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const favorited = highlightedAddresses.some(
      (highlighted) =>
        account.address === highlighted.address &&
        account.brandName === highlighted.brandName
    );

    return (
      <div className="address-wrap-with-padding px-[20px]" style={style}>
        <AddressItem
          balance={account.balance}
          address={account.address}
          type={account.type}
          brandName={account.brandName}
          alias={account.alianName}
          isUpdatingBalance={isUpdateAllBalanceLoading}
          extra={
            <div
              className={clsx(
                'icon-star  border-none px-0',
                favorited ? 'is-active' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                dispatch.addressManagement.toggleHighlightedAddressAsync({
                  address: account.address,
                  brandName: account.brandName,
                });
              }}
            >
              <img
                className="w-[13px] h-[13px]"
                src={favorited ? IconPinnedFill : IconPinned}
                alt=""
              />
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
          onSwitchCurrentAccount={() => {
            switchAccount(account);
          }}
          enableSwitch={enableSwitch}
        />
      </div>
    );
  };

  const isWalletConnect =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.WALLETCONNECT;
  const isLedger =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.HARDWARE.LEDGER;
  const isGridPlus =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.HARDWARE.GRIDPLUS;
  const hasStatusBar = isWalletConnect || isLedger || isGridPlus;

  return (
    <div className="page-address-management px-0 overflow-hidden">
      <PageHeader className="pt-[24px] mx-[20px]">
        {enableSwitch ? 'Current Address' : t('Address Management')}
        <div className="absolute top-24 right-[42px]">
          <IconAddAddress
            viewBox="0 0 20 20"
            className={clsx('text-gray-title w-[20px] h-[20px] cursor-pointer')}
            onClick={gotoAddAddress}
          />
        </div>
        <Tooltip
          title="Update balance data"
          overlayClassName="rectangle"
          placement="left"
        >
          <div className="absolute right-0 top-[24px]">
            {isUpdateAllBalanceLoading ? (
              <div className="w-[20px] h-[20px] flex items-center justify-center">
                <IconLoading
                  viewBox="0 0 20 20"
                  className="text-gray-title w-[16px] h-[16px] cursor-pointer"
                />
              </div>
            ) : (
              <IconRefresh
                className={clsx(
                  'text-gray-title w-[20px] h-[20px] cursor-pointer'
                )}
                onClick={() => {
                  if (isUpdateAllBalanceLoading) {
                    return;
                  }
                  handleUpdateAllBalance();
                }}
              />
            )}
          </div>
        </Tooltip>
      </PageHeader>

      {currentAccountIndex !== -1 && accountList[currentAccountIndex] && (
        <>
          <div className="address-wrap-with-padding px-[20px]">
            <AddressItem
              balance={accountList[currentAccountIndex].balance || 0}
              address={accountList[currentAccountIndex].address || ''}
              type={accountList[currentAccountIndex].type || ''}
              brandName={accountList[currentAccountIndex].brandName || ''}
              alias={accountList[currentAccountIndex].alianName}
              isCurrentAccount
              isUpdatingBalance={isUpdateAllBalanceLoading}
              onClick={() => {
                history.push(
                  `/settings/address-detail?${obj2query({
                    address: accountList[currentAccountIndex].address,
                    type: accountList[currentAccountIndex].type,
                    brandName: accountList[currentAccountIndex].brandName,
                    byImport:
                      ((accountList[currentAccountIndex]
                        .byImport as unknown) as string) || '',
                  })}`
                );
              }}
            >
              {isWalletConnect && (
                <SessionStatusBar
                  address={accountList[currentAccountIndex].address || ''}
                  brandName={accountList[currentAccountIndex].brandName || ''}
                  className="m-[16px] mt-0 text-white bg-[#0000001A]"
                />
              )}
              {isLedger && (
                <LedgerStatusBar className="m-[16px] mt-0 text-white bg-[#0000001A]" />
              )}
              {isGridPlus && (
                <GridPlusStatusBar className="m-[16px] mt-0 text-white bg-[#0000001A]" />
              )}
            </AddressItem>
          </div>
          <div className="flex justify-between items-center text-gray-subTitle text-13 px-20 py-16">
            <div>Switch Address</div>
            <div
              className="flex items-center cursor-pointer"
              onClick={gotoManageAddress}
            >
              <span>Manage Address</span>
              <IconRight />
            </div>
          </div>
        </>
      )}

      {noAccount ? (
        NoAddressUI
      ) : (
        <>
          <header className="p-20">
            <Input
                className="h-[40px] rounded-[6px] p-0 pl-[12px] pr-[12px]"
                size="large"
                prefix={<img className="mr-[10px]" src={IconSearch} />}
                placeholder="Search wallets"
                onChange={handleSearchValChange}
                value={searchVal}
                allowClear
              />
          </header>
          {noSearchResults && NoSearchResultUI}

          <div className={'address-group-list management'}>
            <VList
              height={hasStatusBar ? 450 : 500}
              width="100%"
              itemData={accountListFiltered}
              itemCount={accountListFiltered.length}
              itemSize={(i) => (i !== accountListFiltered.length - 1 ? 64 : 78)}
              className="scroll-container"
            >
              {Row}
            </VList>
          </div>
        </>
      )}
    </div>
  );
};

export default AddressManagement;
