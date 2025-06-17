import React, { useEffect, useMemo } from 'react';

import { KEYRING_TYPE } from 'consts';

import { Account } from '@/background/service/preference';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { flatten } from 'lodash';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { FixedSizeList } from 'react-window';

interface ChainSelectorModalProps {
  onChange(val: Account): void;
  containerClassName?: string;
}

export const AccountList = ({
  onChange,
  containerClassName,
}: ChainSelectorModalProps) => {
  const { fetchAllAccounts, allSortedAccountList } = useAccounts();

  const filteredAccounts = useMemo(() => {
    return flatten(allSortedAccountList);
  }, [allSortedAccountList]);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  return (
    <FixedSizeList
      height={500}
      className={containerClassName}
      width="100%"
      itemData={filteredAccounts}
      itemCount={filteredAccounts.length || 0}
      itemSize={10}
    >
      {({ data, index }) => {
        const current = data[index];
        const prev = data[index - 1];
        const next = data[index + 1];
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
          <>
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
                brandName={current.brandName}
                onClick={() => {
                  onChange?.(current);
                }}
              />
            </div>
            {isLast ? <div className="h-[8px]"></div> : null}
          </>
        );
      }}
    </FixedSizeList>
  );
};
