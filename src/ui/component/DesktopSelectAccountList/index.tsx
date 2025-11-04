import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { AddressViewer } from 'ui/component';

// import './style.less';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';

import { EVENTS, KEYRING_TYPE } from '@/constant';
// import { AddressSortIconMapping, AddressSortPopup } from './SortPopup';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { splitNumberByStep } from '@/ui/utils';
import { isSameAccount } from '@/utils/account';
import { flatten } from 'lodash';
import { CopyChecked } from '../CopyChecked';
import { useApprovalDangerCount } from '@/ui/hooks/useApprovalDangerCount';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useEventListener, useMemoizedFn } from 'ahooks';
import eventBus from '@/eventBus';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { RcIconCopyCC } from '@/ui/assets/desktop/common';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';

interface DesktopSelectAccountListProps {
  shouldElevate?: boolean;
  isShowApprovalAlert?: boolean;
}

export const DesktopSelectAccountList: React.FC<DesktopSelectAccountListProps> = ({
  shouldElevate = false,
  isShowApprovalAlert = false,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const shouldScrollRef = useRef(true);

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
      shouldScrollRef.current = false;
      await dispatch.account.changeAccountAsync(account);
    },
    [dispatch?.account?.changeAccountAsync]
  );

  useEventBusListener(EVENTS.PERSIST_KEYRING, fetchAllAccounts);

  useEffect(() => {
    return onBackgroundStoreChanged('contactBook', (payload) => {
      fetchAllAccounts();
    });
  }, [fetchAllAccounts]);

  const scrollToCurrent = useMemoizedFn(() => {
    const index = filteredAccounts.findIndex(
      (item) => currentAccount && isSameAccount(item, currentAccount)
    );
    console.log(index);
    if (index !== -1) {
      virtuosoRef.current?.scrollToIndex({ index, align: 'start' });
    }
  });

  useEffect(() => {
    console.log('currengAccount Change', currentAccount?.address);
    if (currentAccount?.address && shouldScrollRef.current) {
      scrollToCurrent();
    }
    shouldScrollRef.current = true;
  }, [currentAccount?.address]);

  return (
    <div
      className="flex flex-col gap-[12px] h-[670px] rounded-[20px]"
      style={{
        position: shouldElevate ? 'relative' : 'static',
        zIndex: shouldElevate ? 2000 : 'auto',
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        className="h-full"
        data={filteredAccounts}
        itemContent={(index, item) => {
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
              isShowApprovalCount={isShowApprovalAlert}
            >
              {item.address}
            </AccountItem>
          );
        }}
        increaseViewportBy={100}
      />
      {/* {filteredAccounts.map((item) => {
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
            isShowApprovalCount={isShowApprovalAlert}
          >
            {item.address}
          </AccountItem>
        );
      })} */}
    </div>
  );
};

const AccountItem: React.FC<{
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
  isShowApprovalCount?: boolean;
}> = ({ item, onClick, isSelected, isShowApprovalCount }) => {
  const addressTypeIcon = useBrandIcon({
    ...item,
    // forceLight: isSelected,
  });

  const approvalCount = useApprovalDangerCount({
    address: isShowApprovalCount ? item.address : undefined,
  });

  return (
    <div
      className={clsx(
        'rounded-[20px] px-[16px] cursor-pointer mb-[12px] flex items-center gap-[8px]',
        isSelected
          ? 'py-[20px] border-solid border-[1px] bg-rb-neutral-card1 border-rb-neutral-line'
          : 'pt-[18px] pb-[16px] bg-rb-neutral-bg-3'
      )}
      onClick={onClick}
    >
      <img src={addressTypeIcon} className="w-[24px] h-[24px]" alt="" />
      <div className="flex flex-col gap-[2px]">
        <div className="flex items-center gap-[4px]">
          <div className={clsx('text-[16px] leading-[19px] font-medium')}>
            {item.alianName}
          </div>
          {/* {approvalCount ? (
            <div className="ml-auto">
              <div
                className={clsx(
                  'text-r-neutral-title-2 text-[13px] leading-[16px] font-medium text-center',
                  'px-[1px] min-w-[20px] rounded-[4px]',
                  'bg-r-red-default',
                  'border-[1px] border-solid',
                  isSelected
                    ? 'border-rabby-neutral-title2'
                    : 'border-transparent'
                )}
              >
                {approvalCount}
              </div>
            </div>
          ) : null} */}
        </div>
        <div className="flex items-center">
          <AddressViewer
            address={item.address?.toLowerCase()}
            showArrow={false}
            className={clsx(
              isSelected
                ? 'text-[13px] leading-[16px] text-rb-neutral-title-1'
                : 'text-[12px] leading-[14px] text-rb-neutral-foot'
            )}
          />
          <CopyChecked
            copyIcon={RcIconCopyCC}
            addr={item.address}
            className={clsx('w-[16px] h-[16px] ml-[2px] text-14')}
            copyClassName={clsx(
              isSelected ? 'text-rb-neutral-foot' : 'text-rb-neutral-secondary'
            )}
            checkedClassName={clsx('text-rb-green-default')}
          />
          <div
            className={clsx(
              'ml-[10px] truncate flex-1 block',
              isSelected
                ? 'text-[13px] leading-[16px] text-rb-neutral-title-1'
                : 'text-[12px] leading-[14px]  text-rb-neutral-foot'
            )}
          >
            ${splitNumberByStep(item.balance?.toFixed(2))}
          </div>
        </div>
      </div>
    </div>
  );
};
