import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import clsx from 'clsx';

import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { Account } from '@/background/service/preference';
import { KEYRING_TYPE } from 'consts';
import { isSameAddress } from '@/ui/utils';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';

interface ChainSelectorModalProps {
  onChange(val: Account): void;
  containerClassName?: string;
  filterText?: string;
  whitelist: string[];
  list: IDisplayedAccountWithBalance[];
}

export const AccountList = ({
  onChange,
  list,
  whitelist,
  containerClassName,
}: ChainSelectorModalProps) => {
  return (
    <Virtuoso
      height={500}
      className={clsx('h-full flex-1', containerClassName)}
      width="100%"
      data={list}
      itemContent={(index, item) => {
        const current = item;
        const prev = list[index - 1];
        const next = list[index + 1];
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
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }
                  : {}),
                ...(isGroupLast
                  ? {
                      borderBottomLeftRadius: 12,
                      borderBottomRightRadius: 12,
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
