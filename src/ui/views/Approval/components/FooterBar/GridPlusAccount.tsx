import React from 'react';
import { useTranslation } from 'react-i18next';
import { CommonAccount } from './CommonAccount';
import { WALLET_BRAND_CONTENT } from '@/constant';
import clsx from 'clsx';
import { useGridPlusStatus } from '@/ui/component/ConnectStatus/useGridPlusStatus';

export const GridPlusAccount: React.FC = () => {
  const { status, onClickConnect, connectLoading } = useGridPlusStatus();
  const { t } = useTranslation();

  const TipContent = () => {
    if (status === 'CONNECTED') {
      return (
        <div className="text-r-neutral-body">
          {t('page.signFooterBar.gridPlusConnected')}
        </div>
      );
    }
    return (
      <div className="flex justify-between w-full">
        <div>{t('page.signFooterBar.gridPlusNotConnected')}</div>
        <div
          onClick={onClickConnect}
          className={clsx('cursor-pointer', 'text-14 text-r-neutral-body', {
            'opacity-60': connectLoading,
            underline: !connectLoading,
          })}
        >
          {connectLoading
            ? t('page.signFooterBar.connecting')
            : t('page.signFooterBar.connectButton')}
        </div>
      </div>
    );
  };

  return (
    <CommonAccount
      signal={status}
      icon={WALLET_BRAND_CONTENT.GRIDPLUS.icon}
      tip={<TipContent />}
    />
  );
};
