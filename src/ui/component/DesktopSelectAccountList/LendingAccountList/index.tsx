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

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';

import { EVENTS, KEYRING_TYPE } from '@/constant';
import { RcIconCopyCC } from '@/ui/assets/desktop/common';
import { RcIconAddWalletCC } from '@/ui/assets/desktop/profile';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { formatUsdValue, isSameAddress } from '@/ui/utils';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { isSameAccount } from '@/utils/account';
import { useMemoizedFn } from 'ahooks';
import { flatten } from 'lodash';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { CopyChecked } from '../../CopyChecked';
import './styles.less';
import { Account } from '@/background/service/preference';

export const DesktopLendingSelectAccountList: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const shouldScrollRef = useRef(true);
  const [isAbsolute, setIsAbsolute] = useState(true);
  const history = useHistory();
  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);

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
      (item) =>
        item.type !== KEYRING_TYPE.WatchAddressKeyring &&
        item.type !== KEYRING_TYPE.GnosisKeyring
    );
  }, [sortedAccountsList]);

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const sortedList = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      const aBalance = Number(a.balance || 0);
      const bBalance = Number(b.balance || 0);
      return bBalance - aBalance;
    });
  }, [filteredAccounts]);

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

  const scrollToCurrent = useMemoizedFn(() => {
    const index = sortedList.findIndex(
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
    return Math.min(filteredAccounts.length + 1, 10) * 74 + 12;
  }, [filteredAccounts.length]);

  const ref = useRef<HTMLDivElement>(null);
  const handleResize = useMemoizedFn(() => {
    if (!ref.current) {
      return;
    }
    const left = ref.current.getBoundingClientRect().left;
    const clientWidth = document.body.clientWidth;
    setIsAbsolute(clientWidth - left > 256);
  });

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className={clsx(
        'desktop-lending-select-account-list flex flex-col gap-[12px] rounded-[20px]'
      )}
      style={{ height, position: isAbsolute ? 'absolute' : undefined }}
      ref={ref}
      onMouseEnter={() => {
        if (!isAbsolute) {
          document.querySelector('.main-content')?.classList?.add('is-open');
        }
      }}
      onMouseLeave={() => {
        document.querySelector('.main-content')?.classList?.remove('is-open');
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        className={clsx('h-full')}
        data={sortedList}
        totalCount={sortedList.length}
        defaultItemHeight={72 + 12}
        itemContent={(index, item) => {
          const isSelected = currentAccount
            ? isSameAccount(item, currentAccount)
            : false;

          return (
            <LendingAccountItem
              key={`${item.address}-${item.type}-${item.brandName}`}
              onClick={() => {
                switchAccount(item);
              }}
              isSelected={isSelected}
              item={item}
            >
              {item.address}
            </LendingAccountItem>
          );
        }}
        components={{
          Footer: () => (
            <div
              onClick={() => {
                const searchParams = new URLSearchParams(
                  history.location.search
                );
                searchParams.set('action', 'add-address');
                history.replace({
                  pathname: history.location.pathname,
                  search: searchParams.toString(),
                });
              }}
              className={clsx(
                'cursor-pointer rounded-[20px] h-[62px] p-[16px] flex items-center gap-[8px] text-r-blue-default',
                'desktop-account-item'
              )}
              style={{
                background: 'rgba(76, 101, 255, 0.08)',
              }}
            >
              <RcIconAddWalletCC className="flex-shrink-0" />
              <div className="text-[16px] leading-[19px] font-normal desktop-account-item-content truncate">
                {t('component.DesktopSelectAccountList.addAddresses')}
              </div>
            </div>
          ),
        }}
        increaseViewportBy={100}
      />
    </div>
  );
};

const LendingAccountItem: React.FC<{
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
}> = ({ item, onClick, isSelected }) => {
  const { t } = useTranslation();
  const addressTypeIcon = useBrandIcon({
    ...item,
  });

  const totalSupply = 0;
  const totalBorrow = 0;

  return (
    <div className="pb-[12px] group">
      <div
        className={clsx(
          'rounded-[20px] px-[15px] py-[10px] cursor-pointer flex items-center gap-[8px] min-h-[62px]',
          'border-solid border-[1px]',
          'desktop-account-item',
          isSelected
            ? ' border-rb-neutral-line bg-rb-neutral-card-1'
            : 'border-transparent bg-rb-neutral-bg-3'
        )}
        onClick={onClick}
      >
        <img
          src={addressTypeIcon}
          className={clsx('w-[24px] h-[24px]', !isSelected ? 'opacity-40' : '')}
          alt=""
        />
        <div className="flex flex-1 flex-col gap-[2px] min-w-0 desktop-account-item-content">
          <div className="flex items-center gap-[4px] justify-between">
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
            {totalSupply > 0 || totalBorrow > 0 ? (
              <div
                className={clsx(
                  'ml-[10px] truncate flex-1 block text-right',
                  isSelected
                    ? 'text-[14px] font-bold text-rb-neutral-title-1'
                    : 'text-[14px] font-medium text-rb-neutral-body'
                )}
              >
                {formatUsdValue(totalSupply - totalBorrow)}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
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
            </div>
            {(totalSupply > 0 || totalBorrow > 0) && (
              <div
                className={clsx(
                  'ml-[10px] truncate flex-1 block text-right',
                  isSelected
                    ? 'text-[12px] text-rb-neutral-foot'
                    : 'text-[12px] text-rb-neutral-foot'
                )}
              >
                {totalSupply > 0 && totalBorrow > 0
                  ? t('page.lending.accountActions.both')
                  : totalSupply > 0
                  ? t('page.lending.accountActions.supply')
                  : t('page.lending.accountActions.borrow')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
