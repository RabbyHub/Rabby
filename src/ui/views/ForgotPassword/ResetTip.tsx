import React from 'react';
import { ReactComponent as RecycleSVG } from '@/ui/assets/forgot/recycle.svg';
import { useTranslation } from 'react-i18next';
import { CommonConfirmCard } from './CommonConfirmCard';

export const ResetTip: React.FC<{
  hasStep: boolean;
  onNext: () => void;
}> = ({ hasStep = false, onNext }) => {
  const { t } = useTranslation();

  return (
    <CommonConfirmCard
      hasStep={hasStep}
      onNext={onNext}
      buttonText={t('page.forgotPassword.tip.button')}
      logo={<RecycleSVG />}
      titleText={t('page.forgotPassword.tip.title')}
      descriptionText={t('page.forgotPassword.tip.description')}
    />
  );
};
