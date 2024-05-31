import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface Props {
  onResend: () => void;
}

export const FooterResend: React.FC<Props> = ({ onResend }) => {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        'text-[15px] underline text-r-neutral-body',
        'cursor-pointer',
        'mb-24'
      )}
      onClick={onResend}
    >
      {t('page.signFooterBar.resend')}
    </div>
  );
};
