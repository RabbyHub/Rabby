import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldCheckbox } from 'ui/component';
import { ellipsis } from 'ui/utils/address';
import './style.less';

export interface ISelectAccountItem {
  address: string;
  index: number;
}

interface MultiSelectAddressListArgs {
  accounts: ISelectAccountItem[];
  type: string;
  onChange?(
    arg: {
      address: string;
      index: number;
    }[]
  ): void;
  value?: ISelectAccountItem[];
  importedAccounts?: string[];
}

const MultiSelectAddressList = ({
  accounts,
  onChange,
  value,
  importedAccounts = [],
}: MultiSelectAddressListArgs) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ISelectAccountItem[]>(value || []);

  const handleRemove = (index: number) => {
    const nextVal = selected.filter((item) => item.index !== index);
    setSelected(nextVal);
    onChange?.(nextVal);
  };

  const handleChoose = (account: ISelectAccountItem) => {
    const nextVal = [...selected, account];
    setSelected(nextVal);
    onChange?.(nextVal);
  };

  const handleToggle = (account: ISelectAccountItem) => {
    const inIdxs = selected.findIndex((item) => item.index === account.index);
    if (inIdxs !== -1) {
      handleRemove(account.index);
    } else {
      handleChoose(account);
    }
  };

  useEffect(() => {
    setSelected(value || []);
  }, [value]);

  const importedAddresses = React.useMemo(() => {
    return new Set(
      (importedAccounts || []).map((address) => address.toLowerCase())
    );
  }, [importedAccounts]);

  return (
    <ul className="multiselect-address">
      {accounts.map((account) => {
        const checked = !!selected.find((item) => item.index === account.index);
        const imported = importedAddresses.has(account.address.toLowerCase());
        return (
          <FieldCheckbox
            key={account.index}
            checked={checked}
            onChange={() => handleToggle(account)}
            className="lg:w-full"
            disable={
              imported && (
                <span className="rounded-full bg-gray-bg text-gray-comment text-12 px-[5px] py-[3px]">
                  {t('component.MultiSelectAddressList.imported')}
                </span>
              )
            }
          >
            <div className="multiselect-address__item">
              <span className="multiselect-address__item-index">
                {account.index}
              </span>
              <span
                className="text-15 font-medium text-r-neutral-title1"
                title={account.address.toLowerCase()}
              >
                {ellipsis(account.address.toLowerCase())}
              </span>
            </div>
          </FieldCheckbox>
        );
      })}
    </ul>
  );
};

export default MultiSelectAddressList;
