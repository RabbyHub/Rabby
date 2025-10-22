import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { AddressViewer } from 'ui/component';

// import './style.less';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';

import { KEYRING_TYPE } from '@/constant';
// import { AddressSortIconMapping, AddressSortPopup } from './SortPopup';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { splitNumberByStep } from '@/ui/utils';
import { isSameAccount } from '@/utils/account';
import { flatten } from 'lodash';
import { CopyChecked } from '../CopyChecked';

interface DesktopSelectAccountListProps {
  shouldElevate?: boolean;
}

export const DesktopSelectAccountList: React.FC<DesktopSelectAccountListProps> = ({
  shouldElevate = false,
}) => {
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

  const filteredAccounts = useMemo(() => {
    return flatten(sortedAccountsList).filter(
      (item) => item.type !== KEYRING_TYPE.WatchAddressKeyring
    );
  }, [sortedAccountsList]);

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const switchAccount = useCallback(
    async (account: typeof accountsList[number]) => {
      await dispatch.account.changeAccountAsync(account);
    },
    [dispatch?.account?.changeAccountAsync]
  );

  return (
    <div
      className="flex flex-col gap-[12px]"
      style={{
        position: shouldElevate ? 'relative' : 'static',
        zIndex: shouldElevate ? 2000 : 'auto',
      }}
    >
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
