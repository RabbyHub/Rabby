import React from 'react';
import { useTranslation } from 'react-i18next';

import { BackIcon } from '../icons';

export const ActionPopupTitle = ({
  title,
  onBack,
  className,
  backClassName,
}: {
  title: string;
  onBack: () => void;
  className: string;
  backClassName: string;
}) => {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <button
        type="button"
        className={backClassName}
        onClick={onBack}
        aria-label={t('global.back')}
      >
        <BackIcon />
      </button>
      <span>{title}</span>
    </div>
  );
};
