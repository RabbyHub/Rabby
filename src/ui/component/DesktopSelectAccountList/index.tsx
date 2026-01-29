import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { AddressViewer } from 'ui/component';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';
import { EVENTS, KEYRING_TYPE } from '@/constant';
import { RcIconCopyCC } from '@/ui/assets/desktop/common';
import { RcIconAddWalletCC, RcIconMoreCC } from '@/ui/assets/desktop/profile';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { isSameAddress, splitNumberByStep } from '@/ui/utils';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { obj2query } from '@/ui/utils/url';
import { isSameAccount } from '@/utils/account';
import { useMemoizedFn } from 'ahooks';
import { flatten } from 'lodash';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { CopyChecked } from '../CopyChecked';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import './styles.less';

interface DesktopSelectAccountListProps {
  isShowApprovalAlert?: boolean;
  autoCollapse?: boolean;
}

export const DesktopSelectAccountList: React.FC<DesktopSelectAccountListProps> = ({
  isShowApprovalAlert = false,
  autoCollapse = false,
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
    accountsList,
    highlightedAddresses,
    fetchAllAccounts,
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

  const height = useMemo(() => {
    return Math.min(filteredAccounts.length + 1, 8) * 74 - 12;
  }, [filteredAccounts.length]);

  return (
    <div
      className={clsx(
        'desktop-select-account-list',
        'h-full flex flex-col gap-[12px] rounded-[20px] pb-[20px]'
      )}
    >
      <Virtuoso
        ref={virtuosoRef}
        className={'flex-1'}
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
            >
              {item.address}
            </AccountItem>
          );
        }}

        // increaseViewportBy={100}
      />
      <div
        onClick={() => {
          history.replace(`${location.pathname}?action=add-address`);
        }}
        className={clsx(
          'cursor-pointer rounded-[20px] h-[62px] p-[16px] flex items-center gap-[8px] text-rb-neutral-body',
          'desktop-account-item',
          'bg-rb-neutral-bg-3'
        )}
      >
        <RcIconAddWalletCC className="flex-shrink-0" />
        <div className="text-[16px] leading-[19px] font-normal desktop-account-item-content truncate">
          {t('component.DesktopSelectAccountList.addAddresses')}
        </div>
      </div>
    </div>
  );
};

const AccountItem: React.FC<{
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
  isShowApprovalCount?: boolean;
  isPined?: boolean;
}> = ({ item, onClick, isSelected, isShowApprovalCount, isPined }) => {
  const dispatch = useRabbyDispatch();
  const history = useHistory();
  const addressTypeIcon = useBrandIcon({
    ...item,
  });

  return (
    <div className="pb-[12px] group">
      <div
        className={clsx(
          'rounded-[20px] px-[15px] py-[11px] cursor-pointer flex items-center gap-[8px] min-h-[62px]',
          'border-solid border-[0.5px]',
          'desktop-account-item',
          isSelected
            ? 'border-transparent bg-rb-brand-light-1'
            : 'border-rb-neutral-line hover:bg-rb-neutral-bg-2'
        )}
        onClick={onClick}
      >
        <img
          src={addressTypeIcon}
          className={clsx('w-[24px] h-[24px]')}
          alt=""
        />
        <div className="flex flex-1 flex-col gap-[2px] min-w-0 desktop-account-item-content">
          <div className="flex items-center gap-[4px]">
            <div
              className={clsx(
                'truncate',
                isSelected
                  ? 'text-[16px] leading-[19px] font-bold text-rb-neutral-title-1'
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
          </div>
          <div className="flex items-center">
            <AddressViewer
              address={item.address?.toLowerCase()}
              showArrow={false}
              className={clsx(
                isSelected
                  ? 'text-[12px] leading-[14px] text-rb-neutral-title-1'
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
                  ? 'text-[12px] leading-[14px] text-rb-neutral-title-1'
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
