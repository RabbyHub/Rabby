import { KEYRING_CLASS } from '@/constant';
import React from 'react';
import { SessionSignal } from '../WalletConnect/SessionSignal';
import { GridPlusSignal } from './GridPlusSignal';
import { LedgerSignal } from './LedgerSignal';
import { KeystoneSignal } from './KeystoneSignal';

export interface Props {
  className?: string;
  type: string;
  address: string;
  brandName: string;
}

export const CommonSignal: React.FC<Props> = ({
  className,
  type,
  address,
  brandName,
}) => {
  return (
    <div>
      {type === KEYRING_CLASS.WALLETCONNECT && (
        <SessionSignal
          isBadge
          address={address}
          brandName={brandName}
          pendingConnect
          className={className}
        />
      )}
      {type === KEYRING_CLASS.HARDWARE.LEDGER && (
        <LedgerSignal isBadge className={className} />
      )}
      {type === KEYRING_CLASS.HARDWARE.GRIDPLUS && (
        <GridPlusSignal isBadge className={className} />
      )}
      {/* FIXME: The type `KEYSTONE` refers to airgap type wallets, not specifically to Keystone. To specifically identify Keystone, use `brand`. */}
      {brandName === 'Keystone' && (
        <KeystoneSignal isBadge className={className} />
      )}
      {type === KEYRING_CLASS.Coinbase && (
        <SessionSignal
          isBadge
          address={address}
          brandName={KEYRING_CLASS.Coinbase}
          pendingConnect
          className={className}
        />
      )}
    </div>
  );
};
