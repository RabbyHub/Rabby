import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { pickKeyringThemeIcon } from '@/utils/account';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import {
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
} from 'consts';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconChecked } from 'ui/assets/icon-checked-cc.svg';
import { ReactComponent as RcIconUnchecked } from 'ui/assets/icon-unchecked-cc.svg';
import IconTagNotYou from 'ui/assets/tag-notyou.svg';
import IconTagYou from 'ui/assets/tag-you.svg';
import { NameAndAddress } from 'ui/component';

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
  onSelect(account: Account | null): void;
  checked: boolean;
}

export const AddressItem = ({
  account,
  signed,
  onSelect,
  checked,
}: AddressItemProps) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const disabled = !account.type || signed;
  return (
    <div
      className={clsx(
        'flex items-center gap-[6px] p-[15px] rounded-[8px] border-[1px] border-transparent',
        'bg-r-neutral-card2',
        disabled
          ? 'cursor-not-allowed opacity-70'
          : 'hover:border-rabby-blue-default hover:bg-r-blue-light1 cursor-pointer',
        checked && 'border-rabby-blue-default bg-r-blue-light1'
      )}
      onClick={() => {
        if (disabled) {
          return;
        }
        const isChecked = !checked;
        onSelect(isChecked ? account : null);
      }}
    >
      {account.type ? (
        <ThemeIcon
          className="w-[20px] h-[20px]"
          src={
            pickKeyringThemeIcon(account.type as any, isDarkTheme) ||
            pickKeyringThemeIcon(account.brandName as any, isDarkTheme) ||
            KEYRING_ICONS[account.type] ||
            WALLET_BRAND_CONTENT[account.brandName as string]?.image
          }
        />
      ) : null}
      <NameAndAddress
        address={account.address}
        nameClass={clsx(
          signed ? 'max-100' : 'max-115',
          !account.type
            ? 'no-name'
            : 'text-r-neutral-title1 mr-[4px] leading-[18px]'
        )}
        addressClass="text-r-neutral-body leading-[18px]"
        noNameClass="no-name"
        copyIcon={false}
      />
      <img
        src={account.type ? IconTagYou : IconTagNotYou}
        className="icon icon-tag"
      />

      <div className="ml-auto">
        {signed ? (
          <span className="text-green text-14">
            {t('page.signTx.safeAdminSigned')}
          </span>
        ) : checked ? (
          <div className="text-r-blue-default">
            <RcIconChecked />
          </div>
        ) : (
          <div className="text-r-neutral-body">
            <RcIconUnchecked />
          </div>
        )}
      </div>
    </div>
  );
};
