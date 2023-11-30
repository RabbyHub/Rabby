import React, { useEffect, useMemo, useRef } from 'react';
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

import { Dictionary, groupBy, omit } from 'lodash';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { Tooltip } from 'antd';
import { useRequest } from 'ahooks';
import { SessionStatusBar } from '@/ui/component/WalletConnect/SessionStatusBar';
import { LedgerStatusBar } from '@/ui/component/ConnectStatus/LedgerStatusBar';
import { GridPlusStatusBar } from '@/ui/component/ConnectStatus/GridPlusStatusBar';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import LessPalette from '@/ui/style/var-defs';
// import { AddressSortIconMapping, AddressSortPopup } from './SortPopup';
import { getWalletScore } from '../ManageAddress/hooks';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { SortInput } from './SortInput';
import { nanoid } from 'nanoid';
import { KeystoneStatusBar } from '@/ui/component/ConnectStatus/KeystoneStatusBar';

function NoAddressUI() {
  const { t } = useTranslation();

  return (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-address.png"
        alt={t('page.manageAddress.no-address')}
      />
      <p className="text-gray-content text-14">
        {t('page.manageAddress.no-address')}
      </p>
    </div>
  );
}

function NoSearchedAddressUI() {
  const { t } = useTranslation();

  return (
    <div className="no-matched-address">
      <img
        className="no-data-image w-[52px] h-[52px]"
        src="/images/no-matched-addr.svg"
        alt={t('page.manageAddress.no-match')}
      />
      <p
        className="text-14 mt-[24px]"
        style={{ color: LessPalette['@color-body'] }}
      >
        {t('page.manageAddress.no-match')}
      </p>
    </div>
  );
}

const AddressManagement = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const enableSwitch = location.pathname === '/switch-address';

  const addressSortStore = useRabbySelector(
    (s) => s.preference.addressSortStore
  );

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

    const normalAccounts = highlightedAccounts
      .concat(data['0'] || [])
      .filter((e) => !!e);
    const watchModeAccounts = watchModeHighlightedAccounts
      .concat(data['1'] || [])
      .filter((e) => !!e);
    if (addressSortStore.sortType === 'usd') {
      return [normalAccounts, watchModeAccounts];
    }
    if (addressSortStore.sortType === 'alphabet') {
      return [
        normalAccounts.sort((a, b) =>
          (a?.alianName || '').localeCompare(b?.alianName || '', 'en', {
            numeric: true,
          })
        ),
        watchModeAccounts.sort((a, b) =>
          (a?.alianName || '').localeCompare(b?.alianName || '', 'en', {
            numeric: true,
          })
        ),
      ];
    }

    const normalArr = groupBy(
      sortAccountsByBalance(normalAccounts),
      (e) => e.brandName
    );

    const hdKeyringGroup = groupBy(
      normalArr[KEYRING_TYPE.HdKeyring],
      (a) => a.publicKey
    );
    const ledgersGroup = groupBy(
      normalArr[KEYRING_CLASS.HARDWARE.LEDGER],
      (a) => a.hdPathBasePublicKey || nanoid()
    ) as Dictionary<IDisplayedAccountWithBalance[]>;
    return [
      [
        ...Object.values(ledgersGroup).sort((a, b) => b.length - a.length),
        ...Object.values(hdKeyringGroup).sort((a, b) => b.length - a.length),
        ...Object.values(
          omit(normalArr, [
            KEYRING_TYPE.HdKeyring,
            KEYRING_CLASS.HARDWARE.LEDGER,
          ])
        ),
        sortAccountsByBalance(watchModeAccounts),
      ]
        .filter((e) => Array.isArray(e) && e.length > 0)
        .sort((a, b) => getWalletScore(a) - getWalletScore(b)),
      [],
    ];
  }, [accountsList, highlightedAddresses, addressSortStore.sortType]);

  const [searchKeyword, setSearchKeyword] = React.useState(
    addressSortStore?.search || ''
  );
  const debouncedSearchKeyword = useDebounceValue(searchKeyword, 250);

  const {
    accountList,
    filteredAccounts,
    noAnyAccount,
    noAnySearchedAccount,
  } = useMemo(() => {
    const result = {
      accountList: [
        ...(sortedAccountsList?.flat() || []),
        ...(watchSortedAccountsList || []),
      ],
      filteredAccounts: [] as typeof sortedAccountsList,
      noAnyAccount: false,
      noAnySearchedAccount: false,
    };

    result.filteredAccounts = [...result.accountList];
    if (addressSortStore.sortType === 'addressType') {
      result.filteredAccounts = sortedAccountsList;
    }

    if (debouncedSearchKeyword) {
      const lKeyword = debouncedSearchKeyword.toLowerCase();

      if (addressSortStore.sortType === 'addressType') {
        result.filteredAccounts = (result.filteredAccounts as IDisplayedAccountWithBalance[][])
          .map((group) =>
            group.filter((account) => {
              const lowerAddress = account.address.toLowerCase();
              const aliasName = account.alianName?.toLowerCase();
              let addrIncludeKw = false;
              if (lKeyword.replace(/^0x/, '').length >= 2) {
                addrIncludeKw = account.address
                  .toLowerCase()
                  .includes(lKeyword.toLowerCase());
              }

              return (
                lowerAddress === lKeyword ||
                aliasName?.includes(lKeyword) ||
                addrIncludeKw
              );
            })
          )
          .filter((group) => group.length > 0);
      } else {
        result.filteredAccounts = result.accountList.filter((account) => {
          const lowerAddress = account.address.toLowerCase();
          const aliasName = account.alianName?.toLowerCase();
          let addrIncludeKw = false;
          if (lKeyword.replace(/^0x/, '').length >= 2) {
            addrIncludeKw = account.address
              .toLowerCase()
              .includes(lKeyword.toLowerCase());
          }

          return (
            lowerAddress === lKeyword ||
            aliasName?.includes(lKeyword) ||
            addrIncludeKw
          );
        });
      }
    }

    result.noAnyAccount = result.accountList.length <= 0 && !loadingAccounts;
    result.noAnySearchedAccount =
      result.filteredAccounts.length <= 0 && !loadingAccounts;

    return result;
  }, [
    sortedAccountsList,
    watchSortedAccountsList,
    debouncedSearchKeyword,
    addressSortStore.sortType,
  ]);

  const dispatch = useRabbyDispatch();

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
    history.push('/settings/address?back=true');
  };

  const switchAccount = async (account: typeof accountsList[number]) => {
    await dispatch.account.changeAccountAsync(account);
    history.push('/dashboard');
  };

  useEffect(() => {
    dispatch.whitelist.init();
  }, []);

  const recordLatestAddress = (value: string) => {
    dispatch.preference.setAddressSortStoreValue({
      key: 'lastCurrent',
      value,
    });
  };

  const Row = (
    props: any //ListChildComponentProps<typeof accountsList[] | typeof accountsList>
  ) => {
    const { data, index, style } = props;
    const account = data[index];

    const render = (account: typeof accountsList[number], isGroup = false) => {
      const favorited = highlightedAddresses.some(
        (highlighted) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );

      return (
        <div
          className={clsx(
            'address-wrap-with-padding px-[20px]',
            isGroup && 'row-group'
          )}
          style={!isGroup ? style : undefined}
          key={account.address}
          onMouseEnter={() => {
            recordLatestAddress(`${account.type}-${account.address}`);
          }}
        >
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
                  //@ts-expect-error byImport is boolean
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

    if (addressSortStore.sortType === 'addressType') {
      return (
        <div style={style} className="address-type-container">
          {(account as typeof accountsList)?.map((e) => render(e, true))}
        </div>
      );
    }

    return render(account as typeof accountsList[number]);
  };

  const isWalletConnect =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.WALLETCONNECT;
  const isLedger =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.HARDWARE.LEDGER;
  const isKeystone = accountList[currentAccountIndex]?.brandName === 'Keystone';
  const isGridPlus =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.HARDWARE.GRIDPLUS;
  const isCoinbase =
    accountList[currentAccountIndex]?.type === KEYRING_CLASS.Coinbase;
  const hasStatusBar = isWalletConnect || isLedger || isGridPlus || isCoinbase;

  useEffect(() => {
    dispatch.preference.setAddressSortStoreValue({
      key: 'search',
      value: searchKeyword,
    });
  }, [searchKeyword]);

  const listRef = useRef<
    VList<IDisplayedAccountWithBalance[] | IDisplayedAccountWithBalance[][]>
  >(null);

  useEffect(() => {
    if (addressSortStore.lastCurrent && filteredAccounts?.length) {
      let index = -1;
      let secondIndex = -1;
      let sum = 0;
      if (addressSortStore.sortType === 'addressType') {
        const accounts = filteredAccounts as IDisplayedAccountWithBalance[][];
        index = accounts.findIndex((arr) => {
          const i = arr.findIndex(
            (e) => `${e.type}-${e.address}` === addressSortStore.lastCurrent
          );
          if (i !== -1) {
            secondIndex = i;
            return true;
          }
          return false;
        });
        if (index !== -1) {
          for (let i = 0; i < index; i++) {
            sum += accounts[i].length * 56 + 16;
          }
          sum += secondIndex * 56;
        }
      } else {
        index = (filteredAccounts as IDisplayedAccountWithBalance[]).findIndex(
          (e) => `${e.type}-${e.address}` === addressSortStore.lastCurrent
        );
        if (index !== -1) {
          sum = index * 64;
        }
      }

      listRef.current?.scrollTo(sum);
    }
  }, []);

  const getItemSize = React.useCallback(
    (i: number) => {
      const lastPadding = i === filteredAccounts.length - 1 ? 24 : 0;
      if (addressSortStore.sortType === 'addressType') {
        return (
          52 * (filteredAccounts as typeof accountsList[])[i].length +
          16 +
          lastPadding
        );
      }

      return lastPadding + (i !== sortedAccountsList.length - 1 ? 60 : 76);
    },
    [filteredAccounts, sortedAccountsList, addressSortStore.sortType]
  );

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [accountsList.length]);

  return (
    <div className="page-address-management px-0 overflow-hidden">
      <PageHeader className="pt-[24px] mx-[20px]">
        {enableSwitch
          ? t('page.manageAddress.current-address')
          : t('page.manageAddress.address-management')}
        <div className="absolute top-24 right-[42px]">
          <IconAddAddress
            viewBox="0 0 20 20"
            className={clsx('text-gray-title w-[20px] h-[20px] cursor-pointer')}
            onClick={gotoAddAddress}
          />
        </div>
        <Tooltip
          title={t('page.manageAddress.update-balance-data')}
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
              {isKeystone && (
                <KeystoneStatusBar className="m-[16px] mt-0 text-white bg-[#0000001A]" />
              )}
              {isGridPlus && (
                <GridPlusStatusBar className="m-[16px] mt-0 text-white bg-[#0000001A]" />
              )}
              {isCoinbase && (
                <SessionStatusBar
                  address={accountList[currentAccountIndex].address || ''}
                  brandName={KEYRING_CLASS.Coinbase}
                  className="m-[16px] mt-0 text-white bg-[#0000001A]"
                />
              )}
            </AddressItem>
          </div>
        </>
      )}
      <div className="flex justify-between items-center text-gray-subTitle text-13 px-20 py-16">
        <SortInput
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
        <div
          className="flex items-center cursor-pointer"
          onClick={gotoManageAddress}
        >
          <span>{t('page.manageAddress.manage-address')}</span>
          <IconRight />
        </div>
      </div>
      {noAnyAccount ? (
        <NoAddressUI />
      ) : noAnySearchedAccount ? (
        <NoSearchedAddressUI />
      ) : (
        <div className={'address-group-list management'}>
          <VList
            ref={listRef}
            key={addressSortStore.sortType + debouncedSearchKeyword}
            height={currentAccountIndex === -1 ? 471 : hasStatusBar ? 368 : 417}
            width="100%"
            itemData={filteredAccounts}
            itemCount={filteredAccounts.length}
            itemSize={getItemSize}
            className="address-scroll-container"
            overscanCount={6}
          >
            {Row}
          </VList>
        </div>
      )}
    </div>
  );
};

export default AddressManagement;
