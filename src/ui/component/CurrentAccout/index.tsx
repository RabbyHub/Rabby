import {
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_ICONS_WHITE,
} from '@/constant';
import { useAccount } from '@/ui/store-hooks';
import clsx from 'clsx';
import styled from 'styled-components';
import NameAndAddress from '../NameAndAddress';
import { useWalletConnectIcon } from '../WalletConnect/useWalletConnectIcon';
import React from 'react';
import ImgCopy from 'ui/assets/icon-copy.svg';
import { pickKeyringThemeIcon } from '@/utils/account';
import { useThemeMode } from '@/ui/hooks/usePreference';

const CurrentAccountWrapper = styled.div`
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.13);
  display: inline-flex;
  justify-content: center;
  gap: 6px;
  height: 36px;
  align-items: center;
  padding: 0 15px;

  .icon {
    width: 20px;
    height: 20px;
  }
  .name {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    max-width: 112px;
  }
  .addr {
    font-size: 13px;
    color: #fff;
  }
  &.success {
    background: var(--r-neutral-card2, rgba(255, 255, 255, 0.06));
    .name {
      color: var(--r-neutral-title1, #f7fafc);
    }
    .addr {
      color: var(--r-neutral-body, #d3d8e0);
    }
  }
`;

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
    <CurrentAccountWrapper className={clsx(noInvert && 'success', className)}>
      <img className={clsx('icon')} src={addressTypeIcon} />
      <NameAndAddress
        nameClass="name"
        addressClass="addr"
        copyIcon={noInvert ? true : ImgCopy}
        address={currentAccount?.address}
      />
    </CurrentAccountWrapper>
  );
};
