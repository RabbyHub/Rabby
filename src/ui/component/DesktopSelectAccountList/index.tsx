import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { VariableSizeList as VList, ListOnScrollProps } from 'react-window';
import { AddressViewer, PageHeader } from 'ui/component';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';

// import './style.less';
import { obj2query } from '@/ui/utils/url';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { ReactComponent as RcIconAddAddress } from '@/ui/assets/address/new-address.svg';
import { ReactComponent as RcIconRight } from '@/ui/assets/address/right.svg';
import { ReactComponent as RcNoMatchedAddress } from '@/ui/assets/address/no-matched-addr.svg';

import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useRequest } from 'ahooks';
import { SessionStatusBar } from '@/ui/component/WalletConnect/SessionStatusBar';
import { LedgerStatusBar } from '@/ui/component/ConnectStatus/LedgerStatusBar';
import { GridPlusStatusBar } from '@/ui/component/ConnectStatus/GridPlusStatusBar';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
// import { AddressSortIconMapping, AddressSortPopup } from './SortPopup';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { KeystoneStatusBar } from '@/ui/component/ConnectStatus/KeystoneStatusBar';
import dayjs from 'dayjs';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { flatten, flattenDeep } from 'lodash';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { CopyChecked } from '../CopyChecked';
import { splitNumberByStep } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { isSameAccount } from '@/utils/account';

export const DesktopSelectAccountList = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();

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

  console.log({
    sortedAccountsList,
    watchSortedAccountsList,
    accountsList,
    allSortedAccountList,
  });
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
      filteredAccounts: [] as typeof allSortedAccountList,
      noAnyAccount: false,
      noAnySearchedAccount: false,
    };

    result.filteredAccounts = [...result.accountList];
    if (addressSortStore.sortType === 'addressType') {
      result.filteredAccounts = flatten(sortedAccountsList);
    }

    if (debouncedSearchKeyword) {
      const lKeyword = debouncedSearchKeyword.toLowerCase();

      if (addressSortStore.sortType === 'addressType') {
        result.filteredAccounts = result.filteredAccounts.filter((account) => {
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

  const switchAccount = useCallback(
    async (account: typeof accountsList[number]) => {
      await dispatch.account.changeAccountAsync(account);
    },
    [dispatch?.account?.changeAccountAsync]
  );

  // const isWalletConnect =
  //   accountList[currentAccountIndex]?.type === KEYRING_CLASS.WALLETCONNECT;
  // const isLedger =
  //   accountList[currentAccountIndex]?.type === KEYRING_CLASS.HARDWARE.LEDGER;
  // const isKeystone = accountList[currentAccountIndex]?.brandName === 'Keystone';
  // const isGridPlus =
  //   accountList[currentAccountIndex]?.type === KEYRING_CLASS.HARDWARE.GRIDPLUS;
  // const isCoinbase =
  //   accountList[currentAccountIndex]?.type === KEYRING_CLASS.Coinbase;
  // const hasStatusBar = isWalletConnect || isLedger || isGridPlus || isCoinbase;

  return (
    <div className="flex flex-col gap-[12px]">
      {filteredAccounts.map((item) => {
        const isSelected = currentAccount
          ? isSameAccount(item, currentAccount)
          : false;

        return (
          <AccountItem
            key={`${item.address}-${item.type}-${item.brandName}`}
            onClick={() => {
              switchAccount(item);
            }}
            isSelected={isSelected}
            item={item}
          >
            {item.address}
          </AccountItem>
        );
      })}
    </div>
  );
};

const AccountItem: React.FC<{
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
}> = ({ item, onClick, isSelected }) => {
  const addressTypeIcon = useBrandIcon({
    ...item,
    forceLight: isSelected,
  });

  return (
    <div
      className={clsx(
        'rounded-[8px] opacity-90',
        'px-[16px] py-[14px]',
        'cursor-pointer',
        isSelected
          ? 'bg-r-blue-default shadow-[0_4px_12px_0_rgba(30,58,116,0.08)]'
          : 'bg-r-neutral-card1 shadow-[0_4px_8px_0_rgba(0,0,0,0.10)]'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-[6px]">
        <img src={addressTypeIcon} className="w-[18px] h-[18px]" alt="" />
        <div
          className={clsx(
            'text-[15px] leading-[18px] font-medium',
            isSelected ? 'text-r-neutral-title2' : 'text-r-neutral-title1'
          )}
        >
          {item.alianName}
        </div>
      </div>
      <div className="flex items-center mt-[2px]">
        <AddressViewer
          address={item.address?.toLowerCase()}
          showArrow={false}
          className={clsx(
            'text-[13px] leading-[16px]',
            isSelected ? 'text-r-neutral-title-2' : 'text-r-neutral-foot'
          )}
        />
        <CopyChecked
          addr={item.address}
          className={clsx('w-[14px] h-[14px] ml-[2px] text-14')}
          copyClassName={clsx(
            isSelected && 'text-r-neutral-title-2 brightness-[100]'
          )}
          checkedClassName={clsx(
            isSelected ? 'text-r-neutral-title-2' : 'text-[#00C087]'
          )}
        />
        <span
          className={clsx(
            'ml-[12px] text-12 truncate flex-1 block',
            isSelected ? 'text-r-neutral-title2' : 'text-r-neutral-foot'
          )}
        >
          ${splitNumberByStep(item.balance?.toFixed(2))}
        </span>
      </div>
    </div>
  );
};
