import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldCheckbox } from 'ui/component';
import { ellipsis } from 'ui/utils/address';
import './style.less';

interface SelectAccountItem {
  address: string;
  index: number;
}

interface MultiSelectAddressListArgs {
  accounts: SelectAccountItem[];
  type: string;
  onChange?(
    arg: {
      address: string;
      index: number;
    }[]
  ): void;
  value?: SelectAccountItem[];
  importedAccounts?: string[];
}

const MultiSelectAddressList = ({
  accounts,
  onChange,
  value,
  importedAccounts,
}: MultiSelectAddressListArgs) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SelectAccountItem[]>(value || []);

  const handleRemove = (index: number) => {
    setSelected(selected.filter((item) => item.index !== index));
  };

  const handleChoose = (account: SelectAccountItem) => {
    setSelected([...selected, account]);
  };

  const handleToggle = (account: SelectAccountItem) => {
    const inIdxs = selected.findIndex((item) => item.index === account.index);
    if (inIdxs !== -1) {
      handleRemove(account.index);
    } else {
      handleChoose(account);
    }
  };

  useEffect(() => {
    onChange && onChange(selected);
  }, [selected]);

  return (
    <ul className="multiselect-address">
      {accounts.map((account) => {
        const checked = !!selected.find((item) => item.index === account.index);
        const imported = importedAccounts
          ?.map((address) => address.toLowerCase())
          .includes(account.address.toLowerCase());
        return (
          <FieldCheckbox
            key={account.index}
            checked={checked}
            onChange={() => handleToggle(account)}
            disable={
              imported && (
                <span className="rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]">
                  {t('Imported')}
                </span>
              )
            }
          >
            <div className="multiselect-address__item">
              <span className="multiselect-address__item-index">
                {account.index}
              </span>
              <span
                className="text-15 font-medium text-gray-title"
                title={account.address}
              >
                {ellipsis(account.address)}
              </span>
            </div>
          </FieldCheckbox>
        );
      })}
    </ul>
  );
};

export default MultiSelectAddressList;
