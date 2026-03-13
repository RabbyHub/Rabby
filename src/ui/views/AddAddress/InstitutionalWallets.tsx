import clsx from 'clsx';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WALLET_BRAND_TYPES } from 'consts';
import { Item, PageHeader } from '@/ui/component';
import { useAddAddressWalletOptions } from './shared';

export const InstitutionalWallets: React.FC<{
  isInModal?: boolean;
  onBack?(): void;
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ isInModal, onBack, onNavigate }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const { institutionalWallets } = useAddAddressWalletOptions({ onNavigate });

  const visibleWallets = React.useMemo(
    () =>
      institutionalWallets.filter(
        (wallet) =>
          wallet.brand === WALLET_BRAND_TYPES.GNOSIS ||
          wallet.brand === WALLET_BRAND_TYPES.CoboArgus
      ),
    [institutionalWallets]
  );

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
        'bg-r-neutral-bg-2 flex flex-col overflow-hidden px-[20px]',
        isInModal ? 'h-[600px]' : 'min-h-full'
      )}
    >
      <PageHeader fixed className="pt-[20px]" forceShowBack onBack={handleBack}>
        {t('page.newAddress.connectInstitutionalWallets')}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto pb-[20px]">
        <div className="flex flex-col gap-[12px]">
          {visibleWallets.map((wallet) => (
            <Item
              key={wallet.brand}
              onClick={wallet.onClick}
              px={16}
              py={0}
              bgColor="var(--r-neutral-card-1, #fff)"
              className="h-[52px] rounded-[8px]"
              left={
                <div className="mr-[12px] flex h-[24px] w-[24px] shrink-0 items-center justify-center">
                  <img
                    src={wallet.image}
                    alt={wallet.content}
                    className="h-[24px] w-[24px] shrink-0"
                  />
                </div>
              }
            >
              <div className="flex-1 text-[15px] font-medium leading-[18px] text-r-neutral-title-1">
                {wallet.content}
              </div>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
};
