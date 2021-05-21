import React from 'react';
import { AddressList, FieldCheckbox } from 'ui/component';
import { useSelectOption } from 'ui/utils';

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
          <FieldCheckbox
            key={account.index}
            checked={selected}
            onChange={() => handleToggle(account.index)}
            disable={
              imported && (
                <span className="rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]">
                  Imported
                </span>
              )
            }
          >
            <AddressItem account={account.address} />
          </FieldCheckbox>
        );
      })}
    </ul>
  );
};

export default MultiSelectAddressList;
