import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { openapi } from '@/ui/models/openapi';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, useAlias, useWallet } from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
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

export const SelectAddressList = ({
  onChange,
}: {
  onChange: (account: Account) => void;
}) => {
  const { t } = useTranslation();

  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);

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

  return (
    <>
      <div className="w-full flex justify-between px-20 mb-8 text-r-neutral-foot">
        <div>{t('page.perps.selectAnAddressToLogIn')}</div>
      </div>
      <div className="w-full flex flex-1 flex-col px-20 overflow-auto">
        <Virtuoso
          data={accountsList}
          style={{ height: '100%' }}
          totalCount={accountsList.length}
          fixedItemHeight={56 + 12}
          itemContent={React.useCallback(
            (_, account) => {
              return <AccountItem onChange={onChange} account={account} />;
            },
            [accountsList]
          )}
          components={{
            Footer: () => <div className="h-[36px] w-full" />,
          }}
        />
      </div>
    </>
  );
};

function AccountItem(props: {
  account: IDisplayedAccountWithBalance;
  onChange?: (account: Account) => void;
}) {
  const { account } = props;
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
          <div className="ml-auto">${formatUsdValue(account.balance)}</div>
        </div>
      </div>
    </Item>
  );
}
