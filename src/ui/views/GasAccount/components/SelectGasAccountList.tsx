import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, useAlias, useWallet } from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { GasAccountInfo } from '@rabby-wallet/rabby-api/dist/types';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { AddressViewer, Item } from '@/ui/component';
import { Virtuoso } from 'react-virtuoso';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { CopyChecked } from '@/ui/component/CopyChecked';
import clsx from 'clsx';
import { useGasAccountSign } from '../hooks';

const GAS_ACCOUNT_INFO_CACHE_TTL = 60 * 1000;
const GAS_ACCOUNT_INFO_CACHE_MAX_SIZE = 50;

const getGasAccountListItemKey = (account: {
  address: string;
  type: string;
  brandName: string;
}) =>
  `${account.address.toLowerCase()}-${account.type}-${(
    account.brandName || ''
  ).toLowerCase()}`;

const getGasAccountListFallbackKey = (account: {
  address: string;
  type: string;
}) => `${account.address.toLowerCase()}-${account.type}`;

type GasAccountInfoCacheEntry = {
  data?: GasAccountInfo | null;
  updatedAt: number;
  promise?: Promise<GasAccountInfo | null>;
};

const gasAccountInfoCache = new Map<string, GasAccountInfoCacheEntry>();

const evictGasAccountInfoCache = () => {
  if (gasAccountInfoCache.size <= GAS_ACCOUNT_INFO_CACHE_MAX_SIZE) return;
  const entries = Array.from(gasAccountInfoCache.entries()).sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt
  );
  const toRemove = entries.slice(
    0,
    gasAccountInfoCache.size - GAS_ACCOUNT_INFO_CACHE_MAX_SIZE
  );
  for (const [key] of toRemove) {
    gasAccountInfoCache.delete(key);
  }
};

const getFreshGasAccountInfoCache = (address: string) => {
  const cached = gasAccountInfoCache.get(address.toLowerCase());
  if (!cached) {
    return undefined;
  }

  if (Date.now() - cached.updatedAt > GAS_ACCOUNT_INFO_CACHE_TTL) {
    return undefined;
  }

  return cached.data;
};

const loadGasAccountInfo = async (
  wallet: ReturnType<typeof useWallet>,
  address: string
) => {
  const key = address.toLowerCase();
  const cached = gasAccountInfoCache.get(key);
  if (
    cached?.promise &&
    Date.now() - cached.updatedAt <= GAS_ACCOUNT_INFO_CACHE_TTL
  ) {
    return cached.promise;
  }

  const promise = (async () => {
    let data: GasAccountInfo | null = null;

    try {
      const result = await wallet.openapi.getGasAccountInfoV2({
        id: address,
      });
      data = result?.account || null;
    } catch (_) {
      data = null;
    }

    gasAccountInfoCache.set(key, {
      data,
      updatedAt: Date.now(),
    });
    evictGasAccountInfoCache();
    return data;
  })();

  gasAccountInfoCache.set(key, {
    data: cached?.data,
    updatedAt: Date.now(),
    promise,
  });

  return promise;
};

const useLazyGasAccountInfo = ({
  address,
  enabled,
}: {
  address: string;
  enabled?: boolean;
}) => {
  const wallet = useWallet();
  const [gasAccountInfo, setGasAccountInfo] = useState<GasAccountInfo | null>(
    () => getFreshGasAccountInfoCache(address) || null
  );

  useEffect(() => {
    if (!enabled || !address) {
      return;
    }

    const cached = getFreshGasAccountInfoCache(address);
    if (cached !== undefined) {
      setGasAccountInfo(cached);
      return;
    }

    let mounted = true;

    loadGasAccountInfo(wallet, address).then((data) => {
      if (!mounted) {
        return;
      }
      setGasAccountInfo(data);
    });

    return () => {
      mounted = false;
    };
  }, [address, enabled, wallet]);

  return gasAccountInfo;
};

export const SelectGasAccountList = ({
  onChange,
  value: selectedAccount,
  title,
  listFooter,
  listHeader,
  isGasAccount,
}: {
  onChange?: (account: Account) => void;
  value?: Account;
  title?: string;
  listFooter?: ReactNode;
  listHeader?: ReactNode;
  isGasAccount?: boolean;
}) => {
  const { t } = useTranslation();
  const { accountsWithGasAccountBalance } = useGasAccountSign();

  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);

  const _list = React.useMemo(
    () =>
      sortAccountsByBalance(
        [...accounts].filter(
          (a) =>
            a.type !== KEYRING_CLASS.WATCH && a.type !== KEYRING_CLASS.GNOSIS
        )
      ),
    [accounts]
  );

  const gasAccountListItemMap = useMemo(
    () => new Map(_list.map((item) => [getGasAccountListItemKey(item), item])),
    [_list]
  );
  const gasAccountListFallbackMap = useMemo(() => {
    const map = new Map<string, IDisplayedAccountWithBalance>();

    _list.forEach((item) => {
      const key = getGasAccountListFallbackKey(item);

      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return map;
  }, [_list]);

  const list = useMemo(() => {
    if (!isGasAccount) {
      return _list;
    }
    return accountsWithGasAccountBalance
      .map((item) => {
        const exactMatch = gasAccountListItemMap.get(
          getGasAccountListItemKey(item)
        );
        if (exactMatch) {
          return exactMatch;
        }

        const fallbackMatch = gasAccountListFallbackMap.get(
          getGasAccountListFallbackKey(item)
        );

        return fallbackMatch;
      })
      .filter((item): item is IDisplayedAccountWithBalance => !!item);
  }, [
    _list,
    accountsWithGasAccountBalance,
    gasAccountListFallbackMap,
    gasAccountListItemMap,
    isGasAccount,
  ]);

  return (
    <>
      <div className="w-full flex justify-between px-20 mb-8 text-r-neutral-foot">
        <div>{t('page.gasAccount.gasAccountList.address')}</div>
        <div>{t('page.gasAccount.gasBalance')}</div>
      </div>
      <div className="w-full flex flex-1 flex-col px-20 overflow-auto">
        <Virtuoso
          data={list}
          style={{ height: '100%' }}
          totalCount={list.length}
          fixedItemHeight={56 + 12}
          itemContent={React.useCallback(
            (_, account) => {
              return (
                <AccountItem
                  onChange={onChange}
                  account={account}
                  isGasAccount={isGasAccount}
                />
              );
            },
            [isGasAccount, onChange]
          )}
          components={{
            Footer: () => <div className="h-[36px] w-full" />,
          }}
        />
      </div>
    </>
  );
};

const GasAccountBalance = ({
  account,
}: {
  account?: GasAccountInfo | null;
}) => {
  if (!account || account.no_register || account.balance === 0) {
    return null;
  }
  return (
    <div className="text-13 font-medium text-r-neutral-title1">
      {formatUsdValue(account.balance)}
    </div>
  );
};

function AccountItem(props: {
  account: IDisplayedAccountWithBalance;
  isGasAccount?: boolean;
  onChange?: (account: Account) => void;
}) {
  const { account, isGasAccount } = props;
  const gasAccount = useLazyGasAccountInfo({
    address: account.address,
    enabled: !!isGasAccount,
  });
  const addressTypeIcon = useBrandIcon({
    address: account.address,
    brandName: account.brandName,
    type: account.type,
    forceLight: false,
  });
  const [_alias] = useAlias(account.address);
  const alias = _alias || (account as { aliasName?: string })?.aliasName;
  return (
    <Item
      onClick={() => {
        props?.onChange?.(account);
      }}
      px={16}
      py={0}
      bgColor="var(--r-neutral-card1, #F2F4F7);"
      className="h-[56px] rounded-[6px] mb-12"
      left={<img src={addressTypeIcon} className={'w-[24px] h-[24px]'} />}
      right={
        <div className="ml-auto">
          <GasAccountBalance account={gasAccount} />
        </div>
      }
    >
      <div className="ml-10">
        <div className="text-13 font-medium text-r-neutral-title-1">
          {alias}
        </div>
        <div className="flex items-center">
          <AddressViewer
            address={account.address}
            showArrow={false}
            className={'text-r-neutral-body'}
          />
          <CopyChecked
            addr={account.address}
            className={clsx(
              'w-[14px] h-[14px] ml-4 text-14 textgre cursor-pointer'
            )}
            // copyClassName={clsx()}
            checkedClassName={clsx('text-[#00C087]')}
          />
        </div>
      </div>
    </Item>
  );
}
