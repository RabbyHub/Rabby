import React from 'react';
import { useTranslation } from 'react-i18next';
import { FieldCheckbox } from 'ui/component';
import AddressItem from 'ui/component/AddressList/AddressItem';
import { useSelectOption } from 'ui/utils';

interface MultiSelectAddressListArgs {
  accounts: Array<{
    address: string;
    index: number;
  }>;
  type: string;
  onChange?(arg: number[]): void;
  value?: number[];
  importedAccounts?: string[];
}

const MultiSelectAddressList = ({
  accounts,
  onChange,
  value,
  importedAccounts,
  type,
}: MultiSelectAddressListArgs) => {
  const { t } = useTranslation();
  const [_value, , , handleToggle] = useSelectOption<number>({
    onChange,
    value,
    options: accounts.map((x) => x.index),
  });

  return (
    <ul className="addresses">
      {accounts.map((account, i) => {
        const selected = _value.includes(account.index);
        const imported = importedAccounts
          ?.map((address) => address.toLowerCase())
          .includes(account.address.toLowerCase());
        return (
          <FieldCheckbox
            key={account.index}
            checked={selected}
            onChange={() => handleToggle(i)}
            disable={
              imported && (
                <span className="rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]">
                  {t('Imported')}
                </span>
              )
            }
          >
            <AddressItem
              account={{
                address: account.address,
                type,
                brandName: type,
              }}
              noNeedBalance={!imported}
              showAssets={imported}
              className="select-address-item"
            />
          </FieldCheckbox>
        );
      })}
    </ul>
  );
};

export default MultiSelectAddressList;
