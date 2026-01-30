import { Account } from '@/background/service/preference';
import { KEYRING_TYPE } from '@/constant';
import { ReactComponent as RcArrowDownSVG } from '@/ui/assets/dashboard/arrow-down-cc.svg';
import { RcIconCopyCC } from '@/ui/assets/desktop/common';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { formatUsdValue, splitNumberByStep, useAlias } from '@/ui/utils';
import { isSameAccount } from '@/utils/account';
import { Popover } from 'antd';
import clsx from 'clsx';
import { flatten, sortBy } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { createGlobalStyle } from 'styled-components';
import { AddressViewer } from 'ui/component';
import { CopyChecked } from '../CopyChecked';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { useMount } from 'react-use';
import './styles.less';

interface DesktopAccountSelectorProps {
  value?: Account | null;
  onChange?(account: Account): void;
  scene?: Scene;
}

type Scene = 'perps' | 'prediction';

export const DesktopAccountSelector: React.FC<DesktopAccountSelectorProps> = ({
  value,
  onChange,
  scene,
}) => {
  const { t } = useTranslation();

  const dispatch = useRabbyDispatch();

  const [isOpen, setIsOpen] = React.useState(false);
  const handleChange = useMemoizedFn((account: Account) => {
    onChange?.(account);
    setIsOpen(false);
  });

  useMount(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  });

  return (
    <>
      <Popover
        placement="bottomRight"
        trigger={['click']}
        overlayClassName={'desktop-account-selector-popover'}
        content={
          <AccountList
            scene={scene}
            selectedAccount={value}
            onSelectAccount={handleChange}
          />
        }
        visible={isOpen}
        onVisibleChange={setIsOpen}
        destroyTooltipOnHide
      >
        <div
          className={clsx(
            'py-[11px] pl-[15px] pr-[11px] rounded-[16px]',
            'flex items-center gap-[6px] cursor-pointer',
            'border border-rb-neutral-line',
            'hover:bg-rb-brand-light-1 hover:border-rb-brand-default'
          )}
        >
          {value ? (
            <CurrentAccount account={value} />
          ) : (
            <div className="flex-1 text-[15px] leading-[18px] font-medium text-rb-neutral-title-1">
              Select Address
            </div>
          )}
          <RcArrowDownSVG
            viewBox="0 0 14 14"
            className={clsx('w-[14px] h-[14px] text-r-neutral-foot')}
          />
        </div>
      </Popover>
    </>
  );
};

const CurrentAccount = ({ account }: { account: Account }) => {
  const addressTypeIcon = useBrandIcon({
    address: account.address,
    brandName: account.brandName,
    type: account.type,
    forceLight: false,
  });

  const [alias] = useAlias(account.address);

  return (
    <>
      <img src={addressTypeIcon} className="w-[20px] h-[20px]" alt="" />
      <div className="flex-1 text-[15px] leading-[18px] font-medium text-rb-neutral-title-1">
        {alias}
      </div>
    </>
  );
};

// 10 minutes
const CLEARINGHOUSE_STATE_EXPIRE_TIME = 1000 * 60 * 10;

const useAccountList = (options?: { scene?: Scene }) => {
  const { scene } = options || {};
  const { sortedAccountsList, fetchAllAccounts } = useAccounts();
  const dispatch = useRabbyDispatch();
  const clearinghouseStateMap = useRabbySelector(
    (s) => s.perps.clearinghouseStateMap
  );

  const filteredAccounts = useMemo(() => {
    return flatten(sortedAccountsList).filter((item) => {
      if (scene === 'perps') {
        return ![
          KEYRING_TYPE.WatchAddressKeyring,
          KEYRING_TYPE.GnosisKeyring,
        ].includes(item.type as any);
      }
      return item.type !== KEYRING_TYPE.WatchAddressKeyring;
    });
  }, [sortedAccountsList]);

  useRequest(
    async () => {
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
          });
      }
    },
    {
      refreshDeps: [filteredAccounts],
      cacheKey: `fetch-clearinghouse-state-${filteredAccounts
        .map((item) => item.address)
        .join('-')}`,
      ready: scene === 'perps',
    }
  );

  const perpsAccounts = useMemo(() => {
    if (scene !== 'perps') {
      return [];
    }
    return sortBy(
      filteredAccounts,
      (item) => {
        return -(
          clearinghouseStateMap[item.address.toLowerCase()]?.assetPositions
            ?.length || 0
        );
      },
      (item) => {
        return -(
          clearinghouseStateMap[item.address.toLowerCase()]?.withdrawable || 0
        );
      }
    );
  }, [filteredAccounts, scene, clearinghouseStateMap]);

  const accounts = useMemo(() => {
    if (scene === 'perps') {
      return perpsAccounts;
    }
    return filteredAccounts;
  }, [filteredAccounts, scene, perpsAccounts]);

  useMount(() => {
    if (!sortedAccountsList.length) {
      fetchAllAccounts();
    }
  });

  return {
    accounts,
    clearinghouseStateMap,
  };
};

const AccountList: React.FC<{
  scene?: Scene;
  onSelectAccount?(account: Account): void;
  selectedAccount?: Account | null;
}> = ({ onSelectAccount, selectedAccount, scene }) => {
  const { accounts, clearinghouseStateMap } = useAccountList({
    scene,
  });

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const height = useMemo(() => {
    return Math.min(accounts.length, 8) * 74 - 12;
  }, [accounts.length]);

  const hasScrollbar = useMemo(() => {
    return accounts.length > 8;
  }, [accounts.length]);

  // useEffect(() => {
  //   setTimeout(() => {
  //     const index = accounts.findIndex((item) =>
  //       selectedAccount ? isSameAccount(item, selectedAccount) : false
  //     );
  //     if (index !== -1) {
  //       virtuosoRef.current?.scrollToIndex({
  //         index: index,
  //         align: 'start',
  //       });
  //     }
  //   }, 200);
  // }, [accounts]);

  return (
    <div
      className={clsx(
        'py-[12px] pl-[12px]',
        hasScrollbar ? 'pr-[4px]' : 'pr-[12px]'
      )}
    >
      <Virtuoso
        ref={virtuosoRef}
        className={'w-[300px]'}
        style={{ height: height }}
        data={accounts}
        totalCount={accounts.length}
        defaultItemHeight={72 + 12}
        itemContent={(index, item) => {
          const isLast = index + 1 === accounts?.length;
          const isSelected = selectedAccount
            ? isSameAccount(item, selectedAccount)
            : false;

          return (
            <div
              key={`${item.address}-${item.type}-${item.brandName}`}
              className={clsx(hasScrollbar ? 'pr-[4px]' : '')}
            >
              <AccountItem
                onClick={() => {
                  onSelectAccount?.(item);
                }}
                isSelected={isSelected}
                item={item}
                isLast={isLast}
                scene={scene}
                clearinghouseState={
                  clearinghouseStateMap[item.address.toLowerCase()]
                }
              >
                {item.address}
              </AccountItem>
            </div>
          );
        }}
      />
    </div>
  );
};

const AccountItem: React.FC<{
  scene?: Scene;
  item: IDisplayedAccountWithBalance;
  onClick?(): void;
  isSelected?: boolean;
  isLast?: boolean;
  clearinghouseState?: ClearinghouseState | null;
}> = ({ item, onClick, isSelected, isLast, clearinghouseState, scene }) => {
  const { t } = useTranslation();
  const addressTypeIcon = useBrandIcon({
    ...item,
  });

  return (
    <div className={clsx(!isLast ? 'pb-[12px]' : '', 'group min-h-[1px]')}>
      <div
        className={clsx(
          'rounded-[12px] px-[12px] py-[11px] cursor-pointer flex items-center gap-[8px] min-h-[62px]',
          'border-solid border-[0.5px]',
          'desktop-account-item',
          isSelected
            ? 'border-transparent bg-r-blue-light-2'
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
                'truncate flex-1',
                isSelected
                  ? 'text-[16px] leading-[19px] font-bold text-rb-neutral-title-1'
                  : 'text-[16px] text-rb-neutral-body leading-[19px] font-medium'
              )}
            >
              {item.alianName}
            </div>
            {scene === 'perps' ? (
              <>
                {clearinghouseState?.assetPositions?.length ||
                Number(clearinghouseState?.withdrawable) > 0 ? (
                  <div
                    className={clsx(
                      'ml-[10px] truncate flex-1 block text-right',
                      isSelected
                        ? 'text-[14px] leading-[19px] font-bold text-rb-neutral-title-1'
                        : 'text-[14px] leading-[19px] font-medium text-rb-neutral-body'
                    )}
                  >
                    {formatUsdValue(
                      Number(clearinghouseState?.withdrawable || 0)
                    )}
                  </div>
                ) : null}
              </>
            ) : null}
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
            {scene === 'perps' ? (
              <>
                {clearinghouseState?.assetPositions?.length ? (
                  <div
                    className={clsx(
                      'ml-[10px] truncate flex-1 block text-right',
                      'text-[12px] leading-[14px] text-rb-neutral-foot'
                    )}
                  >
                    {t('page.perpsPro.accountActions.positionCount', {
                      count: Number(clearinghouseState?.assetPositions?.length),
                    })}
                  </div>
                ) : null}
              </>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
