import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { WALLET_BRAND_CONTENT, WALLET_BRAND_TYPES } from '@/constant';
import { CommonAccount } from './CommonAccount';
import { useKeystoneStatus } from '@/ui/component/ConnectStatus/useKeystoneStatus';
import { useThemeMode } from '@/ui/hooks/usePreference';

export const KeystoneAccount: React.FC = () => {
  const { status, onClickConnect } = useKeystoneStatus();
  const { t } = useTranslation();

  const signal = React.useMemo(() => {
    switch (status) {
      case undefined:
      case 'DISCONNECTED':
        return 'DISCONNECTED';

      default:
        return 'CONNECTED';
    }
  }, [status]);

  const TipContent = () => {
    switch (status) {
      case 'DISCONNECTED':
        return (
          <div className="flex justify-between w-full">
            <div>{t('page.signFooterBar.keystoneNotConnected')}</div>
            <div
              onClick={onClickConnect}
              className={clsx(
                'underline cursor-pointer',
                'text-14 text-r-neutral-body'
              )}
            >
              {t('page.signFooterBar.connectButton')}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-r-neutral-body">
            {t('page.signFooterBar.keystoneConnected')}
          </div>
        );
    }
  };

  const { isDarkTheme } = useThemeMode();

  return (
    <CommonAccount
      signal={signal}
      icon={
        isDarkTheme
          ? WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE].lightIcon
          : WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE].icon
      }
      tip={<TipContent />}
    />
  );
};
