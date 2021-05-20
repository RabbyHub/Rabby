import React from 'react';
import cx from 'clsx';
import { AddressList } from 'ui/component';
import { useSelectOption } from 'ui/utils';
import { IconChecked, IconNotChecked } from 'ui/assets';

const { AddressItem } = AddressList;

const MultiSelectAddressList = ({
  accounts,
  onChange,
  value,
  importedAccounts,
}: {
  accounts: Array<{
    address: string;
    index: number;
  }>;
  onChange?(): void;
  value?(): void;
  importedAccounts?: Array<string>;
}) => {
  const [_value, , , handleToggle] = useSelectOption(onChange, value);

  return (
    <ul className="addresses">
      {accounts.map((account) => {
        const selected = _value.includes(account.index);
        const imported = importedAccounts?.includes(account.address);
        return (
          <AddressItem
            className={cx(
              'rounded bg-white mb-8 flex justify-between align-center py-12 pl-16 pr-20 border',
              selected ? 'border-blue' : 'border-white',
              imported && 'opacity-70'
            )}
            key={account.index}
            account={account.address}
            ActionButton={
              onChange &&
              (imported
                ? () => (
                    <span className="rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]">
                      Imported
                    </span>
                  )
                : () => (
                    <img
                      onClick={() => handleToggle(account.index)}
                      src={selected ? IconChecked : IconNotChecked}
                      className="icon icon-checked"
                    />
                  ))
            }
          />
        );
      })}
    </ul>
  );
};

export default MultiSelectAddressList;
