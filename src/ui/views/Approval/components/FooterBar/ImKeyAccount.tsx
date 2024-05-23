import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { WALLET_BRAND_CONTENT } from '@/constant';
import { CommonAccount } from './CommonAccount';
import { useImKeyStatus } from '@/ui/component/ConnectStatus/useImKeyStatus';

const ImKeyIcon = WALLET_BRAND_CONTENT.IMKEY.icon;

export const ImKeyAccount: React.FC = () => {
  const { status, onClickConnect } = useImKeyStatus();
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
            <div>{t('page.signFooterBar.imKeyNotConnected')}</div>
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
          <div className="text-black">
            {t('page.signFooterBar.imKeyConnected')}
          </div>
        );
    }
  };

  return (
    <CommonAccount signal={signal} icon={ImKeyIcon} tip={<TipContent />} />
  );
};
