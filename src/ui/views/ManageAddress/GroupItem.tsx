import { KEYRING_CLASS, KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { pickKeyringThemeIcon } from '@/utils/account';
import clsx from 'clsx';
import React, { useMemo } from 'react';

export const GroupItem = ({
  item,
  active,
  count,
  onChange,
  type,
  brandName,
}: {
  item?: IDisplayedAccountWithBalance;
  active: boolean;
  count: number;
  type: string;
  brandName?: string;
  onChange: () => void;
}) => {
  const { address } = item || {};
  const brandIcon = useWalletConnectIcon(
    address && brandName
      ? {
          address,
          brandName,
          type,
        }
      : null
  );

  const { isDarkTheme } = useThemeMode();

  const addressTypeIcon = useMemo(
    () =>
      (address && brandName ? brandIcon : null) ||
      pickKeyringThemeIcon(type as any, isDarkTheme) ||
      KEYRING_ICONS[type] ||
      WALLET_BRAND_CONTENT?.[brandName || type]?.maybeSvg ||
      WALLET_BRAND_CONTENT?.[brandName || type]?.image,
    [type, brandName, brandIcon, isDarkTheme]
  );

  return (
    <div
      onClick={onChange}
      className={clsx(
        'w-[59px] h-[44px] rounded-[4px] flex items-center justify-center cursor-pointer',
        active
          ? 'bg-blue-light bg-opacity-[0.15]'
          : 'hover:bg-blue-light hover:bg-opacity-[0.08]'
      )}
    >
      <div className="relative flex items-center justify-center">
        <ThemeIcon
          src={addressTypeIcon}
          className={clsx(
            'w-24 h-24',
            type !== KEYRING_CLASS.MNEMONIC && 'rounded-full'
          )}
        />
        <div className="absolute -top-6 -right-6 text-12 text-r-neutral-body bg-r-neutral-bg-2 border-white h-14 px-[4px] border-width-[0.5px] rounded-[90px]">
          {count}
        </div>
      </div>
    </div>
  );
};
