import React from 'react';
import { useTranslation } from 'react-i18next';

export const ClockSkewWarning = ({ onRetry }: { onRetry?: () => void }) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="rounded-[8px] bg-r-orange-light text-r-neutral-title-1 p-16 text-center text-13"
    >
      <p>{t('page.newAddress.walletConnect.clockSkewError')}</p>
      {onRetry && (
        <button
          type="button"
          className="mt-12 text-r-blue-default font-medium"
          onClick={onRetry}
        >
          {t('global.tryAgain')}
        </button>
      )}
    </div>
  );
};
