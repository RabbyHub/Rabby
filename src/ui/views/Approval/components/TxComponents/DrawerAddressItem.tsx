import React from 'react';
import clsx from 'clsx';
import { Account } from 'background/service/preference';
import { NameAndAddress } from 'ui/component';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconTagNotYou from 'ui/assets/tag-notyou.svg';
import { KEYRING_TYPE, KEYRING_CLASS } from 'consts';
import { useTranslation } from 'react-i18next';

export const ownerPriority = [
  KEYRING_TYPE.SimpleKeyring,
  KEYRING_CLASS.MNEMONIC,
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.ONEKEY,
  KEYRING_CLASS.HARDWARE.TREZOR,
  KEYRING_CLASS.HARDWARE.BITBOX02,
  KEYRING_CLASS.WALLETCONNECT,
  KEYRING_CLASS.WATCH,
];

export interface AddressItemProps {
  account: Account;
  signed: boolean;
  onSelect(account: Account): void;
  checked: boolean;
}

export const AddressItem = ({
  account,
  signed,
  onSelect,
  checked,
}: AddressItemProps) => {
  const { t } = useTranslation();
  return (
    <FieldCheckbox
      className={clsx(
        'item',
        !account.type || signed ? 'cursor-default' : 'cursor-pointer',
        {
          disabled: !account.type,
        }
      )}
      showCheckbox={!!account.type}
      rightSlot={
        signed ? (
          <span className="text-green text-14">
            {t('page.signTx.safeAdminSigned')}
          </span>
        ) : undefined
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
      <img
        src={account.type ? IconTagYou : IconTagNotYou}
        className="icon icon-tag"
      />
    </FieldCheckbox>
  );
};
