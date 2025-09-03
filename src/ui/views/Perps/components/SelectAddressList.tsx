import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { openapi } from '@/ui/models/openapi';
import { useRabbySelector } from '@/ui/store';
import {
  formatUsdValue,
  isSameAddress,
  splitNumberByStep,
  useAlias,
  useWallet,
} from '@/ui/utils';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { ReactComponent as RcIconLoginLoading } from 'ui/assets/perps/IconLoginLoading.svg';
import { useRequest } from 'ahooks';
import { sortBy } from 'lodash';
import React, { useEffect, useState } from 'react';
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
  visible,
}: {
  onChange: (account: Account) => Promise<void>;
  visible: boolean;
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

  return (
    <>
      <div className="w-full flex flex-1 flex-col px-20 overflow-auto">
        <Virtuoso
          data={accountsList}
          style={{ height: '100%' }}
          totalCount={accountsList.length}
          fixedItemHeight={56 + 12}
          itemContent={React.useCallback(
            (_, account) => {
              return (
                <AccountItem
                  loading={
                    loadingAddress?.address === account.address &&
                    loadingAddress?.type === account.type
                  }
                  onChange={handleChange}
                  account={account}
                  isLastUsed={
                    isSameAddress(
                      account.address,
                      lastUsedAccount?.address || ''
                    ) && account.type === lastUsedAccount?.type
                  }
                />
              );
            },
            [accountsList, lastUsedAccount, loadingAddress, handleChange]
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
  isLastUsed?: boolean;
  loading: boolean;
  onChange?: (account: Account) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { account, isLastUsed, loading } = props;
  const addressTypeIcon = useBrandIcon({
    address: account.address,
    brandName: account.brandName,
    type: account.type,
    forceLight: false,
  });
  const [_alias] = useAlias(account.address);
  const alias = _alias || (account as { aliasName?: string })?.aliasName;

  const RightArea = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center w-full justify-end">
          <RcIconLoginLoading className="w-16 h-16 animate-spin" />
        </div>
      );
    }
    if (isLastUsed) {
      return (
        <div className="flex items-center w-full justify-end">
          <div className="text-12 px-8 py-4 bg-r-blue-light1 rounded-[4px] font-medium text-r-blue-default">
            {t('page.perps.lastUsed')}
          </div>
        </div>
      );
    }
    return <div />;
  }, [loading, isLastUsed]);

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
        <div
          className={clsx(
            'text-r-neutral-title1 font-medium leading-[18px] text-[15px]'
          )}
        >
          {alias}
        </div>
        <div className="flex items-center">
          <AddressViewer
            address={account.address}
            showArrow={false}
            className={clsx('text-[13px] text-r-neutral-body leading-[16px]')}
          />
          <CopyChecked
            addr={account.address}
            className={clsx('copy-icon w-[14px] h-[14px] ml-4 text-14')}
            // copyClassName={clsx()}
            checkedClassName={clsx('text-[#00C087]')}
          />
          <span className="ml-[12px] text-13 text-r-neutral-body leading-[16px] truncate flex-1 block">
            ${splitNumberByStep(account.balance?.toFixed(2))}
          </span>
        </div>
      </div>
    </Item>
  );
}
