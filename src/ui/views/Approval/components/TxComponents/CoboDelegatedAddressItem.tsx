import React from 'react';
import clsx from 'clsx';
import { NameAndAddress } from 'ui/component';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import { AddressItemProps } from './DrawerAddressItem';

export const CoboDelegatedAddressItem = ({
  account,
  signed,
  onSelect,
  checked,
}: AddressItemProps) => {
  return (
    <FieldCheckbox
      className={clsx(
        'item',
        !account.type || signed ? 'cursor-default' : 'cursor-pointer',
        {
          disabled: !account.type,
        },
        'min-h-[52px]'
      )}
      showCheckbox={!!account.type}
      rightSlot={
        signed ? <span className="text-green text-14">Signed</span> : undefined
      }
      onChange={(checked) => checked && onSelect(account)}
      checked={checked}
      disable={!account.type || signed}
    >
      <NameAndAddress
        address={account.address}
        nameClass={clsx(
          signed ? 'max-100' : 'max-115',
          !account.type && 'no-name'
        )}
        noNameClass="no-name"
      />
    </FieldCheckbox>
  );
};
