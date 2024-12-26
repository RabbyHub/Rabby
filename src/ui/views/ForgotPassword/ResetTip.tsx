import React from 'react';
import { ReactComponent as RecycleSVG } from '@/ui/assets/forgot/recycle.svg';
import { useTranslation } from 'react-i18next';
import { CommonConfirmCard } from './CommonConfirmCard';

export const ResetTip: React.FC<{
  hasUnencryptedKeyringData: boolean;
  onNext: () => void;
}> = ({ hasUnencryptedKeyringData = false, onNext }) => {
  const { t } = useTranslation();

  return (
    <CommonConfirmCard
      hasStep={hasUnencryptedKeyringData}
      onNext={onNext}
      buttonText={
        hasUnencryptedKeyringData
          ? t('page.forgotPassword.tip.button')
          : t('page.forgotPassword.tip.buttonNoData')
      }
      logo={<RecycleSVG />}
      titleText={t('page.forgotPassword.tip.title')}
      descriptionText={
        hasUnencryptedKeyringData
          ? t('page.forgotPassword.tip.description')
          : t('page.forgotPassword.tip.descriptionNoData')
      }
    />
  );
};
