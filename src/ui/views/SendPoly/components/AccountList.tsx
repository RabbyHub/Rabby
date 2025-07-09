import React, { useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import clsx from 'clsx';
import { flatten } from 'lodash';

import { useAccounts } from '@/ui/hooks/useAccounts';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { Account } from '@/background/service/preference';
import { KEYRING_TYPE } from 'consts';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';

interface ChainSelectorModalProps {
  onChange(val: Account): void;
  containerClassName?: string;
  filterText?: string;
}

export const AccountList = ({
  filterText,
  onChange,
  containerClassName,
}: ChainSelectorModalProps) => {
  const dispatch = useRabbyDispatch();

  const { fetchAllAccounts, allSortedAccountList } = useAccounts();
  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));

  const filteredAccounts = useMemo(() => {
    const lowerFilterText = filterText?.toLowerCase() || '';
    const flattenedAccounts = flatten(allSortedAccountList);
    if (!lowerFilterText) {
      return flattenedAccounts;
    }
    return flattenedAccounts.filter((account) => {
      const address = account.address.toLowerCase();
      const brandName = account.brandName?.toLowerCase() || '';
      const aliasName = account.alianName?.toLowerCase() || '';
      return (
        address.includes(lowerFilterText) ||
        brandName.includes(lowerFilterText) ||
        aliasName.includes(lowerFilterText)
      );
    });
  }, [allSortedAccountList, filterText]);

  useEffect(() => {
    fetchAllAccounts();
    dispatch.whitelist.getWhitelist();
  }, [dispatch.whitelist, fetchAllAccounts]);

  return (
    <Virtuoso
      height={500}
      className={clsx('h-full flex-1', containerClassName)}
      width="100%"
      data={filteredAccounts}
      itemContent={(index, item) => {
        const current = item;
        const prev = filteredAccounts[index - 1];
        const next = filteredAccounts[index + 1];
        const isGroupFirst =
          !prev ||
          (prev?.type !== KEYRING_TYPE.WatchAddressKeyring &&
            current?.type === KEYRING_TYPE.WatchAddressKeyring);
        const isGroupLast =
          !next ||
          (current?.type !== KEYRING_TYPE.WatchAddressKeyring &&
            next?.type === KEYRING_TYPE.WatchAddressKeyring);

        const isLast = !next;

        return (
          <div>
            <div
              style={{
                borderBottom: '0.5px solid var(--r-neutral-line, #E0E5EC)',
                background: 'var(--r-neutral-card1, #FFF)',
                ...(isGroupFirst
                  ? {
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }
                  : {}),
                ...(isGroupLast
                  ? {
                      borderBottomLeftRadius: 8,
                      borderBottomRightRadius: 8,
                      marginBottom: 16,
                      borderBottom: 'none',
                    }
                  : {}),
              }}
            >
              <AccountItem
                className="group"
                balance={current.balance}
                address={current.address}
                type={current.type}
                showWhitelistIcon={whitelist.some((item) =>
                  isSameAddress(item, current.address)
                )}
                brandName={current.brandName}
                onClick={() => {
                  onChange?.(current);
                }}
              />
            </div>
            {isLast ? <div className="h-[8px]"></div> : null}
          </div>
        );
      }}
    ></Virtuoso>
  );
};
