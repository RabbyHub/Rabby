import React, { useCallback } from 'react';
import clsx from 'clsx';
import { EcologyContent } from '../../EcologyPopup/EcologyContent';
import { PageHeader } from '@/ui/component';
import { useTranslation } from 'react-i18next';

export const EcosystemBanner = ({
  isVisible: propIsVisible = false,
  onClose,
}: {
  isVisible?: boolean;
  onClose?: () => void;
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const { t } = useTranslation();

  const handleCancel = useCallback(() => {
    onClose?.();
  }, [onClose]);

  React.useEffect(() => {
    setTimeout(() => {
      setIsVisible(propIsVisible);
    }, 100);
  }, [propIsVisible]);

  return (
    <>
      <div className={clsx('ecology-modal z-10', { show: isVisible })}>
        <PageHeader
          forceShowBack
          onBack={handleCancel}
          className="bg-neutral-bg1 sticky top-0"
        >
          {t('page.dashboard.settings.features.ecosystem')}
        </PageHeader>
        <EcologyContent />
      </div>
    </>
  );
};
