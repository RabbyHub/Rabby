import clsx from 'clsx';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/ui/component';
import { useAddAddressWalletOptions, WalletBrandGrid } from './shared';

export const HardwareWallets: React.FC<{
  isInModal?: boolean;
  onBack?(): void;
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ isInModal, onBack, onNavigate }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const { hardwareWallets } = useAddAddressWalletOptions({ onNavigate });
  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    history.goBack();
  }, [history, onBack]);

  return (
    <div
      className={clsx(
        'bg-r-neutral-bg-2 flex flex-col px-20',
        isInModal ? 'h-[600px] overflow-hidden' : 'min-h-full'
      )}
    >
      <PageHeader fixed className="pt-[20px]" forceShowBack onBack={handleBack}>
        {t('page.newAddress.connectHardwareWallets')}
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-auto pb-[20px]">
        <WalletBrandGrid wallets={hardwareWallets} className="mx-0" />
      </div>
    </div>
  );
};
