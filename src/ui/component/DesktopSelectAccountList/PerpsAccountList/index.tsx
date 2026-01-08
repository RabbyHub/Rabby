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
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';

import { EVENTS, KEYRING_TYPE } from '@/constant';
// import { AddressSortIconMapping, AddressSortPopup } from './SortPopup';
import { RcIconCopyCC } from '@/ui/assets/desktop/common';
import { RcIconAddWalletCC, RcIconMoreCC } from '@/ui/assets/desktop/profile';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { formatUsdValue, isSameAddress, splitNumberByStep } from '@/ui/utils';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { obj2query } from '@/ui/utils/url';
import { isSameAccount } from '@/utils/account';
import { useMemoizedFn } from 'ahooks';
import { flatten } from 'lodash';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { CopyChecked } from '../../CopyChecked';
import ThemeIcon from '../../ThemeMode/ThemeIcon';
import './styles.less';
import { Account } from '@/background/service/preference';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';
import { usePerpsProState } from '@/ui/views/DesktopPerps/hooks/usePerpsProState';

// 10 minutes
const CLEARINGHOUSE_STATE_EXPIRE_TIME = 1000 * 60 * 10;

export const DesktopPerpsSelectAccountList: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const clearinghouseStateMap = useRabbySelector(
    (s) => s.perps.clearinghouseStateMap
  );
  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const { login: switchPerpsAccount } = usePerpsProState();
  const currentAccount = currentPerpsAccount;
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const shouldScrollRef = useRef(true);
  const [isAbsolute, setIsAbsolute] = useState(true);
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

  useEffect(() => {
    if (filteredAccounts.length > 0) {
      const currentTs = Date.now();
      const sdk = getPerpsSDK();

      // Filter accounts that need to be fetched
      const accountsToFetch = filteredAccounts.slice(0, 10).filter((item) => {
        const clearinghouseState =
          clearinghouseStateMap[item.address.toLowerCase()];
        return (
          !clearinghouseState ||
          (clearinghouseState?.time &&
            currentTs - clearinghouseState.time >
              CLEARINGHOUSE_STATE_EXPIRE_TIME)
        );
      });

      if (accountsToFetch.length === 0) {
        return;
      }

      // Execute all requests concurrently
      const newMap: Record<string, ClearinghouseState | null> = {};
      const promises = accountsToFetch.map(async (item) => {
        try {
          const res = await sdk.info.getClearingHouseState(item.address);
          newMap[item.address.toLowerCase()] = res;
        } catch (error) {
          console.error(
            `Failed to fetch clearinghouse state for ${item.address}:`,
            error
          );
        }
      });

      // Wait for all requests to complete, then batch update
      Promise.all(promises)
        .then(() => {
          dispatch.perps.setClearinghouseStateMap(newMap);
        })
        .catch((error) => {
          dispatch.perps.setClearinghouseStateMap(newMap);
          console.error('Failed to fetch clearinghouse state:', error);
        });
    }
  }, [filteredAccounts]);

  const switchAccount = useCallback(
    async (account: typeof accountsList[number]) => {
      shouldScrollRef.current = false;
      await switchPerpsAccount(account);
    },
    [switchPerpsAccount]
  );

  useEventBusListener(EVENTS.PERSIST_KEYRING, fetchAllAccounts);
  useEventBusListener(EVENTS.RELOAD_ACCOUNT_LIST, async () => {
    await dispatch.preference.getPreference('addressSortStore');
    fetchAllAccounts();
  });

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
        'desktop-perps-select-account-list flex flex-col gap-[12px] rounded-[20px]'
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
        data={filteredAccounts}
        totalCount={filteredAccounts.length}
        defaultItemHeight={72 + 12}
        itemContent={(index, item) => {
          const isSelected = currentAccount
            ? isSameAccount(item, currentAccount)
            : false;

          return (
            <PerpsAccountItem
              key={`${item.address}-${item.type}-${item.brandName}`}
              onClick={() => {
                switchAccount(item);
              }}
              clearinghouseState={
                isSelected
                  ? clearinghouseState
                  : clearinghouseStateMap[item.address.toLowerCase()]
              }
              isSelected={isSelected}
              item={item}
            >
              {item.address}
            </PerpsAccountItem>
          );
        }}
        components={{
          Footer: () => (
            <div
              onClick={() => {
                history.replace(`${location.pathname}?action=add-address`);
              }}
              className={clsx(
                // 'bg-rb-neutral-bg-3',
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

const PerpsAccountItem: React.FC<{
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
  clearinghouseState: ClearinghouseState | null;
}> = ({ item, onClick, isSelected, clearinghouseState }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const addressTypeIcon = useBrandIcon({
    ...item,
    // forceLight: isSelected,
  });

  return (
    <div className="pb-[12px] group">
      <div
        className={clsx(
          'rounded-[20px] px-[15px] py-[11px] cursor-pointer flex items-center gap-[8px] min-h-[62px]',
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
            {/* <div
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
            </div> */}

            {/* <div
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
            </div> */}

            {Number(clearinghouseState?.marginSummary.accountValue) > 0 ? (
              <div
                className={clsx(
                  'ml-[10px] truncate flex-1 block text-right',
                  isSelected
                    ? 'text-[14px] font-bold text-rb-neutral-title-1'
                    : 'text-[14px] font-medium text-rb-neutral-body'
                )}
              >
                {formatUsdValue(
                  Number(clearinghouseState?.marginSummary.accountValue)
                )}
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

            {clearinghouseState?.assetPositions?.length ? (
              <div
                className={clsx(
                  'ml-[10px] truncate flex-1 block text-right',
                  isSelected
                    ? 'text-[12px] text-rb-neutral-foot'
                    : 'text-[12px] text-rb-neutral-foot'
                )}
              >
                {t('page.perpsPro.accountActions.positionCount', {
                  count: Number(clearinghouseState?.assetPositions?.length),
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
