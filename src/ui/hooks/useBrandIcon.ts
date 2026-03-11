import { useWalletConnectIcon } from '../component/WalletConnect/useWalletConnectIcon';
import { useThemeMode } from './usePreference';
import React from 'react';
import { pickKeyringThemeIcon } from '@/utils/account';
import {
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRINGS_LOGOS,
  WALLET_BRAND_CONTENT,
} from '@/constant';
import SvgWhitelist from '@/ui/views/SendToken/icons/avatar.svg';

export const useBrandIcon = ({
  address,
  brandName,
  type,
  forceLight,
  showWatchWhitelistIcon,
}: {
  address: string;
  brandName: string;
  type: string;
  forceLight?: boolean;
  showWatchWhitelistIcon?: boolean;
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
            forceWatchTransparent: true,
          }) ||
          WALLET_BRAND_CONTENT?.[brandName]?.image ||
          KEYRINGS_LOGOS[type]
        : brandIcon ||
          pickKeyringThemeIcon(brandName as any, {
            needLightVersion: isDarkTheme,
          }) ||
          WALLET_BRAND_CONTENT?.[brandName]?.image ||
          KEYRING_ICONS[type],
    [type, brandName, brandIcon, isDarkTheme, forceLight]
  );

  if (showWatchWhitelistIcon && type === KEYRING_CLASS.WATCH) {
    return SvgWhitelist;
  }

  return addressTypeIcon;
};
