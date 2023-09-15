import React, { useMemo } from 'react';
import { useRabbySelector } from '@/ui/store';
import { Input } from 'antd';
import { useTranslation } from 'react-i18next';
import IconSearch from 'ui/assets/search.svg';
import { AddressSortPopup } from './SortPopup';
import { useSwitch } from '@/ui/utils/switch';

import { ReactComponent as IconSortByUsd } from '@/ui/assets/address/sort-by-usd.svg';
import { ReactComponent as IconSortByType } from '@/ui/assets/address/sort-by-type.svg';
import { ReactComponent as IconSortByAlphabet } from '@/ui/assets/address/sort-by-alphabet.svg';
import { AddressSortStore } from '@/background/service/preference';

export const AddressSortIconMapping: Record<
  AddressSortStore['sortType'],
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  usd: IconSortByUsd,
  addressType: IconSortByType,
  alphabet: IconSortByAlphabet,
};

export const SortInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) => {
  const { t } = useTranslation();
  const sortType = useRabbySelector(
    (s) => s.preference.addressSortStore.sortType
  );
  const { on, turnOff, turnOn } = useSwitch(false);

  const SortIcon = useMemo(() => {
    const Icon = AddressSortIconMapping[sortType];
    return <Icon viewBox="0 0 20 20" className="w-16 h-16" />;
  }, [sortType]);

  return (
    <>
      <div className="sort-input">
        <div className="sort" onClick={turnOn}>
          {/* <img className="w-16 h-16" src={AddressSortIconMapping[sortType]} /> */}
          {SortIcon}
        </div>
        <Input
          className="search-input"
          placeholder={t('page.manageAddress.search')}
          prefix={<img src={IconSearch} className="w-16 h-16" />}
          suffix={null}
          onChange={onChange}
          value={value}
          allowClear
        />
      </div>
      <AddressSortPopup open={on} onCancel={turnOff} />
    </>
  );
};
