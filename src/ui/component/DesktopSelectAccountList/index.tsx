import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { isSameAddress, splitNumberByStep } from '@/ui/utils';
import { isSameAccount } from '@/utils/account';
import { flatten } from 'lodash';
import { CopyChecked } from '../CopyChecked';
import { useApprovalDangerCount } from '@/ui/hooks/useApprovalDangerCount';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useEventListener, useMemoizedFn, useSize } from 'ahooks';
import eventBus from '@/eventBus';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { RcIconCopyCC } from '@/ui/assets/desktop/common';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import './styles.less';
import { RcIconAddWalletCC, RcIconMoreCC } from '@/ui/assets/desktop/profile';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import qs from 'qs';
import { obj2query } from '@/ui/utils/url';

interface DesktopSelectAccountListProps {
  shouldElevate?: boolean;
  isShowApprovalAlert?: boolean;
  isInModal?: boolean;
}

export const DesktopSelectAccountList: React.FC<DesktopSelectAccountListProps> = ({
  isShowApprovalAlert = false,
  isInModal,
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
  useEventBusListener(EVENTS.RELOAD_ACCOUNT_LIST, async () => {
    await dispatch.preference.getPreference('addressSortStore');
    fetchAllAccounts();
  });

  useEffect(() => {
    return onBackgroundStoreChanged('contactBook', (payload) => {
      fetchAllAccounts();
    });
  }, [fetchAllAccounts]);

  const scrollToCurrent = useMemoizedFn(() => {
    const index = filteredAccounts.findIndex(
      (item) => currentAccount && isSameAccount(item, currentAccount)
    );
    if (index !== -1) {
      virtuosoRef.current?.scrollToIndex({ index, align: 'start' });
    }
  });

  useEffect(() => {
    if (currentAccount?.address && shouldScrollRef.current) {
      scrollToCurrent();
    }
    shouldScrollRef.current = true;
  }, [currentAccount?.address]);

  const isShowScroller = filteredAccounts?.length > 8;

  // const Node = (
  //   <>

  //     {/* {filteredAccounts.map((item) => {
  //       const isSelected = currentAccount
  //         ? isSameAccount(item, currentAccount)
  //         : false;

  //       return (
  //         <AccountItem
  //           key={`${item.address}-${item.type}-${item.brandName}`}
  //           onClick={() => {
  //             switchAccount(item);
  //           }}
  //           isSelected={isSelected}
  //           item={item}
  //           isShowApprovalCount={isShowApprovalAlert}
  //         >
  //           {item.address}
  //         </AccountItem>
  //       );
  //     })} */}
  //   </>
  // );

  return (
    <div
      className={clsx(
        'desktop-select-account-list flex flex-col gap-[12px] h-[670px] rounded-[20px]'
      )}
    >
      <Virtuoso
        ref={virtuosoRef}
        className={clsx('h-full', isShowScroller ? 'w-[270px]' : 'w-[260px]')}
        data={filteredAccounts}
        totalCount={filteredAccounts.length}
        defaultItemHeight={72 + 12}
        itemContent={(index, item) => {
          const isSelected = currentAccount
            ? isSameAccount(item, currentAccount)
            : false;

          const isPined = highlightedAddresses.some(
            (highlighted) =>
              isSameAddress(item.address, highlighted.address) &&
              item.brandName === highlighted.brandName
          );
          return (
            <AccountItem
              key={`${item.address}-${item.type}-${item.brandName}`}
              onClick={() => {
                switchAccount(item);
              }}
              isSelected={isSelected}
              isPined={isPined}
              item={item}
              isShowApprovalCount={isShowApprovalAlert}
              isInModal={isInModal}
            >
              {item.address}
            </AccountItem>
          );
        }}
        components={{
          Footer: () => (
            <div
              onClick={() => {
                history.replace(`${location.pathname}?action=add-address`);
              }}
              className="bg-rb-neutral-bg-3 w-[260px] cursor-pointer rounded-[20px] h-[72px] p-[16px] flex items-center gap-[8px] text-r-blue-default"
            >
              <RcIconAddWalletCC />
              <div className="text-[16px] leading-[19px] font-medium">
                {t('component.DesktopSelectAccountList.addAddresses')}
              </div>
            </div>
          ),
        }}
        // increaseViewportBy={100}
      />
    </div>
  );
};

const AccountItem: React.FC<{
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
  isShowApprovalCount?: boolean;
  isInModal?: boolean;
  isPined?: boolean;
}> = ({
  item,
  onClick,
  isSelected,
  isShowApprovalCount,
  isInModal,
  isPined,
}) => {
  const dispatch = useRabbyDispatch();
  const history = useHistory();
  const addressTypeIcon = useBrandIcon({
    ...item,
    // forceLight: isSelected,
  });

  const approvalCount = useApprovalDangerCount({
    address: isShowApprovalCount ? item.address : undefined,
  });

  return (
    <div className="pb-[12px] group">
      <div
        className={clsx(
          'rounded-[20px] pl-[16px] pr-[12px] cursor-pointer flex items-center gap-[8px] min-h-[72px] w-[260px]',
          isSelected
            ? 'py-[19px] border-solid border-[1px] bg-rb-neutral-card-1 border-rb-neutral-line'
            : isInModal
            ? 'pt-[18px] pb-[16px] bg-rb-neutral-bg-4'
            : 'pt-[18px] pb-[16px] bg-rb-neutral-bg-3'
        )}
        onClick={onClick}
      >
        <img
          src={addressTypeIcon}
          className={clsx('w-[24px] h-[24px]', !isSelected ? 'opacity-40' : '')}
          alt=""
        />
        <div className="flex flex-1 flex-col gap-[2px] min-w-0">
          <div className="flex items-center gap-[4px]">
            <div
              className={clsx(
                'truncate',
                isSelected
                  ? 'text-[20px] leading-[24px] font-bold text-rb-neutral-title-1'
                  : 'text-[16px] text-rb-neutral-body leading-[19px] font-medium'
              )}
            >
              {item.alianName}
            </div>
            <div
              className={isPined ? '' : 'opacity-0 group-hover:opacity-100'}
              onClick={(e) => {
                e.stopPropagation();
                dispatch.addressManagement.toggleHighlightedAddressAsync({
                  address: item.address,
                  brandName: item.brandName,
                });
              }}
            >
              <ThemeIcon
                className="w-[16px] h-[16px]"
                src={isPined ? RcIconPinnedFill : RcIconPinned}
              />
            </div>

            <div
              className="ml-auto opacity-0 group-hover:opacity-100 text-r-neutral-body cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                history.replace(
                  `${history.location.pathname}?${obj2query({
                    action: 'address-detail',
                    address: item.address,
                    type: item.type,
                    brandName: item.brandName,
                    //@ts-expect-error byImport is boolean
                    byImport: item.byImport || '',
                  })}`
                );
              }}
            >
              <RcIconMoreCC />
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
                isSelected
                  ? 'text-rb-neutral-foot'
                  : 'text-rb-neutral-secondary'
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
    </div>
  );
};
