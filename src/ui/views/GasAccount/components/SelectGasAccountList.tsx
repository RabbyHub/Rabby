import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, useAlias } from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
import React, { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { AddressViewer, Item } from '@/ui/component';
import { Virtuoso } from 'react-virtuoso';
import { IDisplayedAccountWithBalance } from '@/ui/state/accountToDisplay';
import { CopyChecked } from '@/ui/component/CopyChecked';
import clsx from 'clsx';
import { useGasAccountSign } from '../hooks';

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

type GasAccountListRow = {
  account: IDisplayedAccountWithBalance;
  /** undefined outside gas account mode, where no balance column is shown */
  gasBalance?: number;
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

  const list = useMemo<GasAccountListRow[]>(() => {
    if (!isGasAccount) {
      return _list.map((account) => ({ account }));
    }
    return accountsWithGasAccountBalance
      .map((item): GasAccountListRow | undefined => {
        const account =
          gasAccountListItemMap.get(getGasAccountListItemKey(item)) ??
          gasAccountListFallbackMap.get(getGasAccountListFallbackKey(item));

        // discovery already fetched this balance; reusing it saves one request
        // per row every time the picker opens
        return account ? { account, gasBalance: item.balance } : undefined;
      })
      .filter((row): row is GasAccountListRow => !!row);
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
            (_, row: GasAccountListRow) => {
              return (
                <AccountItem
                  onChange={onChange}
                  account={row.account}
                  gasBalance={row.gasBalance}
                />
              );
            },
            [onChange]
          )}
          components={{
            Footer: () => <div className="h-[36px] w-full" />,
          }}
        />
      </div>
    </>
  );
};

/** the gas account balance, not the account's on-chain balance */
const GasAccountBalance = ({ gasBalance }: { gasBalance?: number }) => {
  if (!gasBalance) {
    return null;
  }
  return (
    <div className="text-13 font-medium text-r-neutral-title1">
      {formatUsdValue(gasBalance)}
    </div>
  );
};

function AccountItem(props: {
  account: IDisplayedAccountWithBalance;
  gasBalance?: number;
  onChange?: (account: Account) => void;
}) {
  const { account, gasBalance } = props;
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
          <GasAccountBalance gasBalance={gasBalance} />
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
