import { useWalletConnectIcon } from '../component/WalletConnect/useWalletConnectIcon';
import { useThemeMode } from './usePreference';
import React from 'react';
import { pickKeyringThemeIcon } from '@/utils/account';
import {
  KEYRING_ICONS,
  KEYRINGS_LOGOS,
  WALLET_BRAND_CONTENT,
} from '@/constant';

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

  const addressTypeIcon = React.useMemo(
    () =>
      forceLight
        ? brandIcon ||
          pickKeyringThemeIcon(type as any, {
            needLightVersion: true,
          }) ||
          WALLET_BRAND_CONTENT?.[brandName]?.image ||
          KEYRINGS_LOGOS[type]
        : brandIcon ||
          pickKeyringThemeIcon(brandName as any, {
            needLightVersion: isDarkTheme,
          }) ||
          WALLET_BRAND_CONTENT?.[brandName]?.image ||
          KEYRING_ICONS[type],
    [type, brandName, brandIcon, isDarkTheme]
  );

  return addressTypeIcon;
};
