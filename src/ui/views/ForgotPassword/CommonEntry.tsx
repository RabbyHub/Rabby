import React from 'react';
import { ReactComponent as LockSVG } from '@/ui/assets/forgot/lock.svg';
import { useTranslation } from 'react-i18next';
import { CommonConfirmCard } from './CommonConfirmCard';

export const CommonEntry: React.FC<{
  hasStep: boolean;
  onNext: () => void;
}> = ({ hasStep = false, onNext }) => {
  const { t } = useTranslation();

  return (
    <CommonConfirmCard
      hasStep={hasStep}
      onNext={onNext}
      buttonText={t('page.forgotPassword.home.button')}
      logo={<LockSVG />}
      logoClassName="p-16 rounded-full bg-r-neutral-card2"
      titleText={t('page.forgotPassword.home.title')}
      descriptionText={t('page.forgotPassword.home.description')}
    />
  );
};
