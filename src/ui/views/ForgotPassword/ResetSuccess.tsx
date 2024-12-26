import React from 'react';
import { ReactComponent as LockSVG } from '@/ui/assets/forgot/lock-success.svg';
import { useTranslation } from 'react-i18next';
import { CommonConfirmCard } from './CommonConfirmCard';

export const ResetSuccess: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => {
  const { t } = useTranslation();

  return (
    <CommonConfirmCard
      onNext={onNext}
      logo={<LockSVG />}
      logoClassName="p-16 rounded-full bg-r-green-light"
      titleText={t('page.forgotPassword.success.title')}
      descriptionText={t('page.forgotPassword.success.description')}
      buttonText={t('page.forgotPassword.success.button')}
    />
  );
};
