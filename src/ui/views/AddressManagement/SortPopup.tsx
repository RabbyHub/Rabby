import { Item, Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import ImgSortByUsd from '@/ui/assets/address/sort-by-usd-l.svg';
import ImgSortByType from '@/ui/assets/address/sort-by-type.svg';
import ImgSortByAlphabet from '@/ui/assets/address/sort-by-alphabet.svg';
import ImgChecked from '@/ui/assets/address/checked.svg';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { AddressSortStore } from '@/background/service/preference';
import { useTranslation } from 'react-i18next';

const AddressSortImgMapping: Record<AddressSortStore['sortType'], string> = {
  usd: ImgSortByUsd,
  addressType: ImgSortByType,
  alphabet: ImgSortByAlphabet,
};

export const AddressSortPopup = ({
  open,
  onCancel,
}: {
  open: boolean;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const sortType = useRabbySelector(
    (s) => s.preference.addressSortStore.sortType
  );
  const dispath = useRabbyDispatch();
  const handleChange = (value: AddressSortStore['sortType']) => () => {
    dispath.preference.setAddressSortStoreValue({ key: 'sortType', value });
    onCancel?.();
  };

  const arr = useMemo(
    () =>
      [
        {
          key: 'usd',
          label: t('page.manageAddress.sort-by-balance'),
        },
        {
          key: 'addressType',
          label: t('page.manageAddress.sort-by-address-type'),
        },
        {
          key: 'alphabet',
          label: t('page.manageAddress.sort-by-address-note'),
        },
      ] as const,
    []
  );
  return (
    <Popup
      title={t('page.manageAddress.sort-address')}
      closable
      visible={open}
      height={258}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-8">
        {arr.map((e) => (
          <Item
            key={e.key}
            py={13}
            bgColor="var(--r-neutral-card-2, #F2F4F7)"
            leftIcon={AddressSortImgMapping[e.key]}
            onClick={handleChange(e.key)}
            className="text-14 text-r-neutral-title-1 font-normal"
            leftIconClassName="mr-12 w-20"
            rightIcon={sortType === e.key ? ImgChecked : null}
            rightIconClassName="w-20"
          >
            {e.label}
          </Item>
        ))}
      </div>
    </Popup>
  );
};
