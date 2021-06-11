import React from 'react';
import { AddressList, FieldCheckbox } from 'ui/component';
import { useSelectOption } from 'ui/utils';

const { AddressItem } = AddressList;

interface MultiSelectAddressListArgs {
  accounts: Array<{
    address: string;
    index: number;
  }>;
  onChange?(arg: number[]): void;
  value?: number[];
  importedAccounts?: string[];
}

const MultiSelectAddressList = ({
  accounts,
  onChange,
  value,
  importedAccounts,
}: MultiSelectAddressListArgs) => {
  const [_value, , , handleToggle] = useSelectOption<number>({
    onChange,
    value,
    options: accounts.map((x) => x.index),
  });

  return (
    <ul className="addresses">
      {accounts.map((account, i) => {
        const selected = _value.includes(account.index);
        const imported = importedAccounts?.includes(account.address);
        return (
          <FieldCheckbox
            key={account.index}
            checked={selected}
            onChange={() => handleToggle(i)}
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
