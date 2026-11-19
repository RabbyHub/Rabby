import {
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_ICONS_WHITE,
} from '@/constant';
import { useAccount } from '@/ui/store-hooks';
import clsx from 'clsx';
import NameAndAddress from '../NameAndAddress';
import { useWalletConnectIcon } from '../WalletConnect/useWalletConnectIcon';
import React from 'react';
import ImgCopy from 'ui/assets/icon-copy.svg';
import { pickKeyringThemeIcon } from '@/utils/account';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { cn } from '@/ui/utils/cn';
import styles from './index.module.css';

export const CurrentAccount = ({
  className,
  noInvert = true,
}: {
  className?: string;
  noInvert?: boolean;
}) => {
  const [currentAccount] = useAccount();
  const brandIcon = useWalletConnectIcon(currentAccount);
  const { isDarkTheme } = useThemeMode();

  if (!currentAccount) return null;
  const addressTypeIcon: string = noInvert
    ? brandIcon ||
      pickKeyringThemeIcon(currentAccount.brandName as any, {
        needLightVersion: isDarkTheme,
      }) ||
      KEYRING_ICONS[currentAccount.type] ||
      WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
    : brandIcon ||
      WALLET_BRAND_CONTENT[currentAccount.brandName]?.image ||
      KEYRING_ICONS_WHITE[currentAccount.type];

  return (
    <div
      className={cn(styles.currentAccount, noInvert && 'success', className)}
    >
      <img className={clsx('icon')} src={addressTypeIcon} />
      <NameAndAddress
        nameClass="name"
        addressClass="addr"
        copyIcon={noInvert ? true : ImgCopy}
        address={currentAccount?.address}
      />
    </div>
  );
};
