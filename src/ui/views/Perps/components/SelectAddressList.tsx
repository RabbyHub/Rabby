import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { ReactComponent as RcIconChecked } from '@/ui/assets/check-2.svg';
import { AddressViewer, Item } from '@/ui/component';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { useRabbySelector } from '@/ui/store';
import {
  formatUsdValue,
  isSameAddress,
  splitNumberByStep,
  useAlias,
  useWallet,
} from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';
import { useRequest } from 'ahooks';
import clsx from 'clsx';
import { keyBy, sortBy, uniqBy } from 'lodash';
import React, {
  ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { GroupedVirtuoso, TopItemListProps } from 'react-virtuoso';
import { ReactComponent as RcIconLoginLoading } from 'ui/assets/perps/IconLoginLoading.svg';
import { getPerpsSDK } from '../sdkManager';

export const SelectAddressList = ({
  currentAccount,
  onChange,
  visible,
}: {
  onChange: (account: Account) => Promise<void>;
  visible: boolean;
  currentAccount?: Account | null;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);
  const [lastUsedAccount, setLastUsedAccount] = useState<Account | null>(null);
  const [loadingAddress, setLoadingAddress] = useState<Account | null>(null);

  useEffect(() => {
    if (visible) {
      setLoadingAddress(null);
      wallet
        .getPerpsLastUsedAccount()
        .then((account) => setLastUsedAccount(account));
    }
  }, [wallet, visible]);

  const accountsList = React.useMemo(
    () =>
      sortAccountsByBalance(
        [...accounts].filter(
          (a) =>
            a.type !== KEYRING_CLASS.WATCH && a.type !== KEYRING_CLASS.GNOSIS
        )
      ),
    [accounts]
  );

  const { data: _data, runAsync: runFetchPerpsInfo } = useRequest(
    async () => {
      const sdk = getPerpsSDK();
      const list = uniqBy(accountsList, (i) => i.address.toLowerCase());

      const res = await Promise.all(
        list.slice(0, 10).map(async (item) => {
          try {
            const info = await sdk.info.getClearingHouseState(item.address);
            return {
              address: item.address,
              info,
            };
          } catch (e) {
            return {
              address: item.address,
              info: null,
            };
          }
        })
      );

      const resDict = keyBy(res, (item) => item.address.toLowerCase());

      const dict = {
        active: [],
        inactive: [],
      } as Record<
        string,
        { info?: ClearinghouseState; account: IDisplayedAccountWithBalance }[]
      >;
      accountsList.forEach((account, index) => {
        const item = resDict[account.address.toLowerCase()];
        if (
          item?.info &&
          (item.info.assetPositions.length ||
            +item.info.marginSummary > 0 ||
            +item.info.withdrawable > 0)
        ) {
          dict.active.push({
            info: {
              ...item.info,
            },
            account: account,
          });
        } else {
          dict.inactive.push({ account: account });
        }
      });
      dict.active = sortBy(
        dict.active,
        (item) => -(item.info?.marginSummary.accountValue || 0)
      );

      return {
        groupCounts: [dict.active.length, dict.inactive.length],
        groups: ['active', 'inactive'],
        list: [...dict.active, ...dict.inactive],
        dict,
      };

      // return dict;
    },
    {
      manual: true,
      cacheKey: `PerpsAccountSelectorPopup-fetchPerpsInfo-${accountsList
        .map((i) => i.address)
        .join('-')}`,
      // cacheTime: 10 * 1000,
      staleTime: 10 * 1000,
    }
  );

  const data = useMemo(() => {
    if (!_data) {
      const list = accountsList.map((item) => ({
        account: item,
        info: undefined,
      }));
      return {
        groupCounts: [0, list.length],
        groups: ['active', 'inactive'],
        list,
        dict: { inactive: list, active: [] },
      };
    }
    return _data;
  }, [_data, accountsList]);

  const handleChange = async (account: Account) => {
    if (loadingAddress) {
      return;
    }

    try {
      setLoadingAddress(account);
      await onChange(account);
      setLoadingAddress(null);
    } catch (error) {
      setLoadingAddress(null);
    }
  };

  const renderGroupContent = useCallback(
    (index: number) => {
      if (data.groups[index] === 'active' && data.dict?.active.length) {
        return (
          <div className="text-[12px] leading-[14px] text-r-neutral-body font-normal pb-[8px] flex items-center justify-between">
            <div>{t('page.perps.accountSelector.activatedAddress')}</div>
            <div>{t('page.perps.accountSelector.hyperliquidBalance')}</div>
          </div>
        );
      }
      if (data.groups[index] === 'inactive' && data.dict?.active.length) {
        return (
          <div className="text-[12px] leading-[14px] text-r-neutral-body font-normal pb-[8px]">
            {t('page.perps.accountSelector.notActivatedAddress')}
          </div>
        );
      }
      return <div className="h-[1px]" />;
    },
    [data, t]
  );

  const renderItemContent = useCallback(
    (index) => {
      const item = data.list[index];
      const account = item?.account;
      const info = item?.info;
      if (!account) {
        return null;
      }
      return (
        <AccountItem
          loading={
            loadingAddress?.address === account.address &&
            loadingAddress?.type === account.type
          }
          onChange={handleChange}
          account={account}
          info={info}
          isCurrent={
            isSameAddress(account.address, currentAccount?.address || '') &&
            account.type === currentAccount?.type
          }
          isLastUsed={
            isSameAddress(account.address, lastUsedAccount?.address || '') &&
            account.type === lastUsedAccount?.type
          }
          isLogin={!!currentAccount}
        />
      );
    },
    [data.list, handleChange, currentAccount, lastUsedAccount, loadingAddress]
  );

  useEffect(() => {
    if (visible) {
      runFetchPerpsInfo();
    }
  }, [visible, runFetchPerpsInfo]);

  return (
    <>
      <div className="w-full flex flex-1 flex-col px-20 overflow-auto">
        <GroupedVirtuoso
          data={accountsList}
          style={{ height: '100%' }}
          groupCounts={data.groupCounts}
          // fixedItemHeight={56 + 12}
          groupContent={renderGroupContent}
          itemContent={renderItemContent}
          components={{
            // TopItemList: React.Fragment,
            TopItemList: GroupHeaderContainer,
            Footer: () => <div className="h-[36px] w-full" />,
          }}
        />
      </div>
    </>
  );
};

function AccountItem(props: {
  account: IDisplayedAccountWithBalance;
  info?: ClearinghouseState;
  isLastUsed?: boolean;
  isCurrent?: boolean;
  isLogin?: boolean;
  loading: boolean;
  onChange?: (account: Account) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { account, isLastUsed, loading, info, isCurrent, isLogin } = props;
  const addressTypeIcon = useBrandIcon({
    address: account.address,
    brandName: account.brandName,
    type: account.type,
    forceLight: false,
  });
  const [_alias] = useAlias(account.address);
  const alias = _alias || (account as { aliasName?: string })?.aliasName;

  const positionAllPnl = useMemo(() => {
    return info?.assetPositions?.length
      ? info?.assetPositions?.reduce((acc, asset) => {
          return acc + Number(asset.position.unrealizedPnl || 0);
        }, 0) || 0
      : null;
  }, [info?.assetPositions]);

  const RightArea = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center w-full justify-end">
          <RcIconLoginLoading className="w-16 h-16 animate-spin" />
        </div>
      );
    }
    if (info) {
      return (
        <div className="flex flex-col gap-[4px] items-end ml-auto">
          <div className="text-[13px] leading-[16px] text-r-neutral-body font-medium">
            {formatUsdValue(info?.marginSummary.accountValue || 0)}
          </div>
          {positionAllPnl !== null ? (
            <div
              className={clsx(
                'text-[12px] leading-[14px] font-medium',
                positionAllPnl >= 0
                  ? 'text-r-green-default'
                  : 'text-r-red-default'
              )}
            >
              {positionAllPnl >= 0 ? '+' : '-'}$
              {splitNumberByStep(Math.abs(positionAllPnl).toFixed(2))}
            </div>
          ) : (
            <div className="text-[12px] leading-[14px] font-normal text-r-neutral-foot">
              {t('page.perps.accountSelector.noPosition')};
            </div>
          )}
        </div>
      );
    }

    return <div />;
  }, [loading, isLastUsed, info]);

  return (
    <Item
      onClick={async () => {
        await props?.onChange?.(account);
      }}
      px={16}
      py={0}
      right={RightArea}
      bgColor=" var(--r-neutral-card1, #FFF);"
      className="h-[56px] rounded-[6px] mb-12"
      left={
        <img
          src={addressTypeIcon}
          className={'w-[28px] h-[28px] rounded-full'}
        />
      }
    >
      <div className="ml-10">
        <div className="flex items-center gap-[4px]">
          <div
            className={clsx(
              'text-r-neutral-title1 font-medium leading-[16px] text-[13px]'
            )}
          >
            {alias}
          </div>
          <div>
            {isCurrent ? (
              <RcIconChecked className="text-r-green-default w-[16px] h-[16px]" />
            ) : isLogin ? null : isLastUsed ? (
              <span className="text-[11px] leading-[13px] px-6 py-2 bg-r-blue-light1 rounded-[4px] font-medium text-r-blue-default">
                {t('page.perps.lastUsed')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center">
          <AddressViewer
            address={account.address}
            showArrow={false}
            className={clsx(
              'text-[12px] font-normal text-r-neutral-body leading-[14px]'
            )}
          />
          <CopyChecked
            addr={account.address}
            className={clsx('copy-icon w-[12px] h-[12px] ml-4 text-12')}
            // copyClassName={clsx()}
            checkedClassName={clsx('text-[#00C087]')}
          />
          <span className="ml-[4px] text-13 text-r-neutral-body leading-[16px] truncate flex-1 block">
            ${splitNumberByStep(account.balance?.toFixed(2))}
          </span>
        </div>
      </div>
    </Item>
  );
}

const GroupHeaderContainer: ComponentType<TopItemListProps> = ({
  children,
  ...rest
}: TopItemListProps) => {
  return (
    <div {...rest} style={{ position: 'static' }}>
      {children}
    </div>
  );
};
