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
    background: #f5f6fa;
    .name {
      color: #13141a;
    }
    .addr {
      color: #4b4d59;
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

  if (!currentAccount) return null;
  const addressTypeIcon: string = noInvert
    ? brandIcon ||
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
