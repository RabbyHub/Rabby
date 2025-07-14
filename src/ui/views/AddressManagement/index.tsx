import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { VariableSizeList as VList, ListOnScrollProps } from 'react-window';
// import { PageHeader } from 'ui/component';
import AddressItem from './AddressItem';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';

import './style.less';
import { obj2query } from '@/ui/utils/url';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { ReactComponent as RcIconAddAddress } from '@/ui/assets/address/new-address.svg';
import { ReactComponent as RcIconRight } from '@/ui/assets/address/right.svg';
import { ReactComponent as RcNoMatchedAddress } from '@/ui/assets/address/no-matched-addr.svg';

import { KEYRING_CLASS } from '@/constant';
import { useRequest } from 'ahooks';
import { SessionStatusBar } from '@/ui/component/WalletConnect/SessionStatusBar';
import { LedgerStatusBar } from '@/ui/component/ConnectStatus/LedgerStatusBar';
import { GridPlusStatusBar } from '@/ui/component/ConnectStatus/GridPlusStatusBar';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
// import { AddressSortIconMapping, AddressSortPopup } from './SortPopup';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { SortInput } from './SortInput';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { KeystoneStatusBar } from '@/ui/component/ConnectStatus/KeystoneStatusBar';
import dayjs from 'dayjs';
import { useAccounts } from '@/ui/hooks/useAccounts';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import { Button, Callout, Flex, Text } from '@radix-ui/themes';
import { LucideInfo, LucideWallet } from 'lucide-react';
import AddressRow from 'ui/views/AddressManagement/AddressRow';

function NoAddressUI() {
  const { t } = useTranslation();

  return (
    <div className="no-address pt-[90px]">
      <ThemeIcon
        className="no-data-image w-[52px] h-[52px]"
        src={RcNoMatchedAddress}
      />
      <p className="text-14 text-r-neutral-body mt-[24px]">
        {t('page.manageAddress.no-address')}
      </p>
    </div>
  );
}

function NoSearchedAddressUI() {
  const { t } = useTranslation();

  return (
    <div className="no-matched-address">
      <ThemeIcon
        className="no-data-image w-[52px] h-[52px]"
        src={RcNoMatchedAddress}
      />
      <p className="text-14 text-r-neutral-body mt-[24px]">
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
  const dispatch = useRabbyDispatch();

  const {
    sortedAccountsList,
    watchSortedAccountsList,
    addressSortStore,
    accountsList,
    highlightedAddresses,
    fetchAllAccounts,
    loadingAccounts,
    allSortedAccountList,
  } = useAccounts();
  console.log('Address management - sortedAccountsList', sortedAccountsList);
  console.log('Address management - accountsList', accountsList);
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
      accountList: allSortedAccountList,
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

  useEffect(() => {
    fetchAllAccounts();
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

  const gotoAddAddress = useCallback(() => {
    history.push('/add-address');
  }, []);

  const gotoManageAddress = useCallback(() => {
    history.push('/settings/address?back=true');
  }, []);

  const switchAccount = useCallback(
    async (account: typeof accountsList[number]) => {
      await dispatch.account.changeAccountAsync(account);
      history.push('/dashboard');
    },
    [dispatch?.account?.changeAccountAsync]
  );

  useEffect(() => {
    dispatch.whitelist.init();
  }, []);

  const AddNewAddressColumn = useMemo(() => {
    return (
      <>
        <Flex direction={'column'} align={'center'} justify={'center'} p={'3'}>
          <Button highContrast size={'3'} onClick={gotoAddAddress}>
            <LucideWallet size={15} />
            <Text size={'2'} weight={'bold'}>
              {t('page.manageAddress.addNewAddress')}
            </Text>
          </Button>
        </Flex>

        {/*<div
          onClick={gotoAddAddress}
          className="mt-24 h-[52px] flex items-center justify-center gap-[8px] bg-r-neutral-card-1 rounded-lg cursor-pointer"
        >
          <RcIconAddAddress
            viewBox="0 0 20 20"
            className={clsx('text-r-blue-default w-[20px] h-[20px] ')}
          />

          <span className="text-13 text-r-blue-default font-medium">
            {t('page.manageAddress.addNewAddress')}
          </span>
        </div>*/}
      </>
    );
  }, [gotoAddAddress]);

  const Row = useCallback(
    (
      props: any //ListChildComponentProps<typeof accountsList[] | typeof accountsList>
    ) => {
      console.log('Address management - Row', props);
      const { data, index, style } = props;
      const account = data[index];

      const render = (
        account: typeof accountsList[number],
        isGroup = false
      ) => {
        const favorited = highlightedAddresses.some(
          (highlighted) =>
            account.address === highlighted.address &&
            account.brandName === highlighted.brandName
        );

        return (
          <>
            <Flex
              direction={'column'}
              gap={'2'}
              my={'2'}
              // className={clsx(isGroup && 'row-group')}
              // style={!isGroup ? style : undefined}
              key={account.address}
            >
              <AddressItem
                balance={account.balance}
                address={account.address}
                type={account.type}
                brandName={account.brandName}
                alias={account.alianName}
                isCurrentAccount={account.address === currentAccount?.address}
                isUpdatingBalance={isUpdateAllBalanceLoading}
                extra={
                  <div
                    className={clsx(
                      'icon-star border-none px-0',
                      favorited
                        ? 'is-active'
                        : 'opacity-0 group-hover:opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch.addressManagement.toggleHighlightedAddressAsync({
                        address: account.address,
                        brandName: account.brandName,
                      });
                    }}
                  >
                    <ThemeIcon
                      className="w-[13px] h-[13px]"
                      src={favorited ? RcIconPinnedFill : RcIconPinned}
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
              >
                {isWalletConnect && (
                  <SessionStatusBar
                    address={accountList[currentAccountIndex].address || ''}
                    brandName={accountList[currentAccountIndex].brandName || ''}
                    className="m-[16px] mt-0 text-white bg-[#0000001A]"
                    type={accountList[currentAccountIndex].type}
                  />
                )}
              </AddressItem>

              {/*{!isGroup && index === data.length - 1
                ? AddNewAddressColumn
                : null}*/}
            </Flex>
          </>
        );
      };

      /*if (addressSortStore.sortType === 'addressType') {
        return (
          <div style={style} className="address-type-container">
            {(account as typeof accountsList)?.map((e) => render(e, true))}
            {index === data.length - 1 ? (
              <div className="mx-20">{AddNewAddressColumn}</div>
            ) : null}
          </div>
        );
      }*/

      return render(account as typeof accountsList[number]);
    },
    [
      highlightedAddresses,
      isUpdateAllBalanceLoading,
      switchAccount,
      addressSortStore?.sortType,
      dispatch?.addressManagement?.toggleHighlightedAddressAsync,
    ]
  );

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

  const handleScroll = useCallback(
    (p: ListOnScrollProps) => {
      dispatch.preference.setAddressSortStoreValue({
        key: 'lastScrollOffset',
        value: p.scrollOffset,
      });
    },
    [dispatch?.preference?.setAddressSortStoreValue]
  );

  useEffect(() => {
    if (
      addressSortStore.lastCurrentRecordTime &&
      dayjs().isAfter(
        dayjs.unix(addressSortStore.lastCurrentRecordTime).add(15, 'minute')
      )
    ) {
      setSearchKeyword('');
      return () => {
        dispatch.preference.setAddressSortStoreValue({
          key: 'lastCurrentRecordTime',
          value: dayjs().unix(),
        });
      };
    }

    if (
      addressSortStore.lastCurrentRecordTime &&
      addressSortStore.lastScrollOffset &&
      filteredAccounts?.length
    ) {
      listRef.current?.scrollTo(addressSortStore.lastScrollOffset);

      return () => {
        dispatch.preference.setAddressSortStoreValue({
          key: 'lastCurrentRecordTime',
          value: dayjs().unix(),
        });
      };
    }
  }, []);

  const getItemSize = React.useCallback(
    (i: number) => {
      const lastAddAddrBtn = 52 + 24;
      const lastPadding =
        i === filteredAccounts.length - 1 ? 24 + lastAddAddrBtn : 0;
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

  const dynamicCallOut = () => {
    const callOutTexts = [
      'Right click to edit your account name',
      'Right click to see your account details',
      'Right click to see your private key',
      'Right click to copy your address',
      'Right click to share your address',
    ];
    return callOutTexts[Math.floor(Math.random() * callOutTexts.length)];
  };

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>
          {enableSwitch
            ? t('page.manageAddress.current-address')
            : t('page.manageAddress.address-management')}
        </PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} gap={'3'}>
          <Callout.Root size={'1'} color="gray" variant="soft" highContrast>
            <Callout.Icon>
              <LucideInfo size={18} />
            </Callout.Icon>
            {/* @ts-expect-error "This is a negligible error" */}
            <Callout.Text>{dynamicCallOut()}</Callout.Text>
          </Callout.Root>

          <Flex align={'center'} justify={'between'} py={'4'}>
            {/*<SortInput
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />*/}
            <Flex align={'center'} className="cursor-pointer">
              <Button variant={'soft'} onClick={gotoManageAddress}>
                <span>{t('page.manageAddress.manage-address')}</span>
              </Button>
            </Flex>
          </Flex>

          {/* TODO: June 13, 2025. Remember this for when handling Ledger connections */}
          {/*{currentAccountIndex !== -1 && accountList[currentAccountIndex] && (
            <>
              <Flex direction={'column'} gap={'2'} py={'2'}>
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
                      brandName={
                        accountList[currentAccountIndex].brandName || ''
                      }
                      className="m-[16px] mt-0 text-white bg-[#0000001A]"
                      type={accountList[currentAccountIndex].type}
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
                      type={KEYRING_CLASS.Coinbase}
                    />
                  )}
                </AddressItem>
              </Flex>
            </>
          )}*/}

          {noAnyAccount && <NoAddressUI />}
          {noAnySearchedAccount && <NoSearchedAddressUI />}
          {!(noAnyAccount && noAnySearchedAccount) &&
            filteredAccounts.length > 0 &&
            filteredAccounts.map((_, index) => (
              <Flex direction={'column'} gap={'2'} py={'2'}>
                <AddressRow
                  data={filteredAccounts}
                  index={index}
                  style={{}}
                  accountsList={accountsList}
                  highlightedAddresses={highlightedAddresses}
                  isUpdateAllBalanceLoading={isUpdateAllBalanceLoading}
                  dispatch={dispatch}
                  currentAccount={currentAccount}
                  history={history}
                  enableSwitch={enableSwitch}
                  switchAccount={switchAccount}
                  addressSortStore={addressSortStore}
                  AddNewAddressColumn={AddNewAddressColumn}
                  currentAccountIndex={currentAccountIndex}
                  accountList={accountList}
                  isWalletConnect={isWalletConnect}
                />
              </Flex>
            ))}

          {/* Uncomment the following lines if you want to use the VList component */}
          {/*<div className={'address-group-list management'}>*/}

          {/*{Row}*/}
          {/*<VList
            ref={listRef}
            key={addressSortStore.sortType + debouncedSearchKeyword}
            height={
              currentAccountIndex === -1 ? 471 : hasStatusBar ? 368 : 417
            }
            width="100%"
            itemData={filteredAccounts}
            itemCount={filteredAccounts.length}
            itemSize={getItemSize}
            overscanCount={6}
            // onScroll={handleScroll}
          >
            {Row}
          </VList>*/}

          {noAnyAccount ? (
            <NoAddressUI />
          ) : noAnySearchedAccount ? (
            <NoSearchedAddressUI />
          ) : (
            <div className={'space-y-2'}>
              <VList
                ref={listRef}
                key={addressSortStore.sortType + debouncedSearchKeyword}
                height={
                  currentAccountIndex === -1 ? 471 : hasStatusBar ? 368 : 417
                }
                width="100%"
                itemData={filteredAccounts}
                itemCount={filteredAccounts.length}
                itemSize={getItemSize}
                overscanCount={6}
                onScroll={handleScroll}
              >
                {Row}
              </VList>
            </div>
          )}
        </Flex>
      </PageBody>

      {AddNewAddressColumn}

      {/*<div className="page-address-management px-0 overflow-hidden">
        <PageHeader className="pt-[24px] mx-[20px]">
          {enableSwitch
            ? t('page.manageAddress.current-address')
            : t('page.manageAddress.address-management')}
          <div className="bg-r-neutral-card1 rounded absolute top-20 right-0 w-[32px] h-[28px] flex items-center justify-center">
            <RcIconAddAddress
              viewBox="0 0 20 20"
              className={clsx(
                'text-r-blue-default w-[20px] h-[20px] cursor-pointer'
              )}
              onClick={gotoAddAddress}
            />
          </div>
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
                    type={accountList[currentAccountIndex].type}
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
                    type={KEYRING_CLASS.Coinbase}
                  />
                )}
              </AddressItem>
            </div>
          </>
        )}
        <div className="flex justify-between items-center text-r-neutral-body text-13 px-20 py-16">
          <SortInput
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <div
            className="flex items-center cursor-pointer "
            onClick={gotoManageAddress}
          >
            <span>{t('page.manageAddress.manage-address')}</span>
            <RcIconRight className="relative top-1" />
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
              onScroll={handleScroll}
            >
              {Row}
            </VList>
          </div>
        )}
      </div>*/}
    </PageContainer>
  );
};

export default AddressManagement;
