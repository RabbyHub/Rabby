import clsx from 'clsx';
import React from 'react';
import { Tooltip } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Item, PageHeader } from '@/ui/component';
import { useAddAddressWalletOptions } from './shared';

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
        'bg-r-neutral-bg-2 flex flex-col overflow-hidden px-[20px]',
        isInModal ? 'h-[600px]' : 'min-h-full'
      )}
    >
      <PageHeader fixed className="pt-[20px]" forceShowBack onBack={handleBack}>
        {t('page.newAddress.connectHardwareWallets')}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto pb-[20px]">
        <div className="flex flex-col gap-[12px]">
          {hardwareWallets.map((wallet) => {
            const row = (
              <Item
                key={wallet.brand}
                onClick={wallet.onClick}
                disabled={wallet.preventClick}
                px={16}
                py={0}
                bgColor="var(--r-neutral-card-1, #fff)"
                className={clsx(
                  'h-[52px] rounded-[8px]',
                  wallet.preventClick
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                )}
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
            );

            if (wallet.tipI18nKey) {
              return (
                <Tooltip
                  key={wallet.brand}
                  title={t(wallet.tipI18nKey)}
                  placement="topLeft"
                  overlayClassName="rectangle w-[max-content] max-w-[355px]"
                >
                  <div>{row}</div>
                </Tooltip>
              );
            }

            return row;
          })}
        </div>
      </div>
    </div>
  );
};
