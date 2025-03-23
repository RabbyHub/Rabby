import React from 'react';
import { ReactComponent as LockSVG } from '@/ui/assets/forgot/lock.svg';
import { useTranslation } from 'react-i18next';
import { CommonConfirmCard } from './CommonConfirmCard';

export const CommonEntry: React.FC<{
  hasEncryptedKeyringData: boolean;
  onNext: () => void;
}> = ({ hasEncryptedKeyringData = false, onNext }) => {
  const { t } = useTranslation();

  return (
    <CommonConfirmCard
      hasStep={!hasEncryptedKeyringData}
      onNext={onNext}
      buttonText={
        hasEncryptedKeyringData
          ? t('page.forgotPassword.home.button')
          : t('page.forgotPassword.home.buttonNoData')
      }
      logo={<LockSVG />}
      logoClassName="p-16 rounded-full bg-r-neutral-card2"
      titleText={t('page.forgotPassword.home.title')}
      descriptionText={
        hasEncryptedKeyringData
          ? t('page.forgotPassword.home.description')
          : t('page.forgotPassword.home.descriptionNoData')
      }
    />
  );
};
