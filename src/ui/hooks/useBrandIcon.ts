import { useWalletConnectIcon } from '../component/WalletConnect/useWalletConnectIcon';
import { useThemeMode } from './usePreference';
import React from 'react';
import { pickKeyringThemeIcon } from '@/utils/account';
import {
  KEYRING_ICONS,
  KEYRING_TYPE,
  KEYRINGS_LOGOS,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import { useRabbySelector } from '../store';

export const useBrandIcon = ({
  address,
  brandName,
  type,
  forceLight,
}: {
  address: string;
  brandName: string;
  type: string;
  forceLight?: boolean;
}) => {
  const brandIcon = useWalletConnectIcon({
    address,
    brandName,
    type,
  });

  const { isDarkTheme } = useThemeMode();

  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const isWhitelist = React.useMemo(
    () =>
      type === KEYRING_TYPE.WatchAddressKeyring
        ? !accountsList.some(
            (acc) =>
              acc.address.toLowerCase() === address.toLowerCase() &&
              acc.type === KEYRING_TYPE.WatchAddressKeyring
          )
        : false,
    [address, type, accountsList]
  );

  const addressTypeIcon = React.useMemo(
    () =>
      forceLight
        ? brandIcon ||
          pickKeyringThemeIcon(
            isWhitelist ? KEYRING_TYPE.Whitelist : (type as any),
            {
              needLightVersion: true,
              forceWatchTransparent: true,
            }
          ) ||
          WALLET_BRAND_CONTENT?.[brandName]?.image ||
          KEYRINGS_LOGOS[type]
        : brandIcon ||
          pickKeyringThemeIcon(
            isWhitelist ? KEYRING_TYPE.Whitelist : (brandName as any),
            {
              needLightVersion: isDarkTheme,
            }
          ) ||
          WALLET_BRAND_CONTENT?.[brandName]?.image ||
          KEYRING_ICONS[type],
    [type, brandName, brandIcon, isDarkTheme, forceLight, isWhitelist]
  );

  return addressTypeIcon;
};
