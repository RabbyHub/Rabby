import { KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
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

  const addressTypeIcon = useMemo(
    () =>
      (address && brandName ? brandIcon : null) ||
      KEYRING_ICONS[type] ||
      WALLET_BRAND_CONTENT?.[brandName || type]?.image,
    [type, brandName, brandIcon]
  );

  return (
    <div
      onClick={onChange}
      className={clsx(
        'w-[59px] h-[44px] rounded-[4px] flex items-center justify-center cursor-pointer',
        active && 'bg-blue-light bg-opacity-[0.15]'
      )}
    >
      <div className="relative flex items-center justify-center">
        <img src={addressTypeIcon} className="rounded-full w-24 h-24" />
        <div className="absolute -top-6 -right-6 text-12 text-gray-content bg-gray-divider border-white h-14 px-[4px] border-width-[0.5px] rounded-[90px]">
          {count}
        </div>
      </div>
    </div>
  );
};
