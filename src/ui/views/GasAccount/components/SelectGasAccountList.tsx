import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { openapi } from '@/ui/models/openapi';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, useAlias, useWallet } from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { GasAccountInfo } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { sortBy } from 'lodash';
import React from 'react';
import { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AddressItem from '../../AddressManagement/AddressItem';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { AddressViewer, Item } from '@/ui/component';
import { Virtuoso } from 'react-virtuoso';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { CopyChecked } from '@/ui/component/CopyChecked';
import clsx from 'clsx';

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

  const wallet = useWallet();

  const { data: gasAccountBalanceDict } = useRequest(
    async () => {
      if (!isGasAccount) {
        return;
      }
      const res = await Promise.all(
        _list.map((item) => {
          return wallet.openapi
            .getGasAccountInfoV2({
              id: item.address,
            })
            .catch(() => null);
        })
      );
      const dict: Record<string, GasAccountInfo> = {};
      res.forEach((item) => {
        if (item?.account) {
          dict[item.account.id.toLowerCase()] = item.account;
        }
      });
      return dict;
    },
    {
      cacheKey: 'batch-fetch-gas-account-info',
      staleTime: 1000 * 15,
    }
  );

  const list = useMemo(() => {
    if (!isGasAccount || !gasAccountBalanceDict) {
      return _list;
    }
    return sortBy(_list, (item) => {
      const info = gasAccountBalanceDict[item.address.toLowerCase()];
      if (!info) {
        return 2;
      }
      return !info.balance ? (info.no_register ? 1 : 0) : -info.balance;
    });
  }, [_list, gasAccountBalanceDict, isGasAccount]);

  console.log('gasAccountBalanceDict', gasAccountBalanceDict);

  return (
    <>
      <div className="w-full flex justify-between px-20 mb-8 text-r-neutral-foot">
        <div>{t('page.gasAccount.gasAccountList.address')}</div>
        <div>{t('page.gasAccount.gasAccountList.gasAccountBalance')}</div>
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
                  gasAccount={
                    gasAccountBalanceDict?.[account.address.toLowerCase()]
                  }
                />
              );
            },
            [list, gasAccountBalanceDict]
          )}
          components={{
            Footer: () => <div className="h-[36px] w-full" />,
          }}
        />
      </div>
    </>
  );
};

const GasAccountBalance = ({ account }: { account?: GasAccountInfo }) => {
  console.log('account', account);
  if (!account || account.no_register) {
    return null;
  }
  return (
    <div className="text-13 font-medium text-r-neutral-title1">
      {account?.balance ? formatUsdValue(account?.balance) : '$0'}
    </div>
  );
};

function AccountItem(props: {
  account: IDisplayedAccountWithBalance;
  gasAccount?: GasAccountInfo;
  onChange?: (account: Account) => void;
}) {
  const { account, gasAccount } = props;
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
      bgColor="var(--r-neutral-card2, #F2F4F7);"
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
