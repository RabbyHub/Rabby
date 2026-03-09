import { UI_TYPE } from '@/constant/ui';
import { BlueHeader } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAddAddressWalletOptions, WalletBrandGrid } from './shared';

export const HardwareWallets: React.FC<{
  isInModal?: boolean;
  onBack?(): void;
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ isInModal, onBack, onNavigate }) => {
  const { t } = useTranslation();
  const { hardwareWallets } = useAddAddressWalletOptions({ onNavigate });

  return (
    <div
      className={clsx(
        'add-address',
        isInModal ? 'min-h-0 h-[600px] overflow-auto' : ''
      )}
    >
      <BlueHeader
        className="mx-[-20px] h-[48px]"
        fillClassName="mb-[20px] h-[48px]"
        fixed
        onBack={onBack}
      >
        {t('page.newAddress.connectHardwareWallets')}
      </BlueHeader>
      <div
        className={clsx('rabby-container', UI_TYPE.isDesktop ? 'w-full' : '')}
      >
        <WalletBrandGrid wallets={hardwareWallets} className="mx-0" />
      </div>
    </div>
  );
};
