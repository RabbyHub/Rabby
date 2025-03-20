import React from 'react';
import { ReactComponent as RcIconArrowCCRight } from 'ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RCIconEco } from 'ui/assets/dashboard/icon-eco.svg';
import clsx from 'clsx';
import { EcologyContent } from '../../EcologyPopup/EcologyContent';
import { PageHeader } from '@/ui/component';
import { useTranslation } from 'react-i18next';

export const EcosystemBanner: React.FC = () => {
  const [isShowEcology, setIsShowEcologyModal] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const { t } = useTranslation();
  const [isHover, setIsHover] = React.useState(false);

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsShowEcologyModal(false);
    }, 500);
  };

  React.useEffect(() => {
    setTimeout(() => {
      setIsVisible(isShowEcology);
    }, 100);
  }, [isShowEcology]);

  return (
    <>
      <div
        onMouseMove={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className={clsx('rounded-[6px]', 'p-1 mb-[15px]')}
        style={{
          backgroundImage: isHover
            ? 'linear-gradient(91deg, rgba(80, 174, 119, 1) 3.82%, rgba(212, 122, 85, 1) 98.95%)'
            : 'none',
        }}
      >
        <div
          onClick={() => setIsShowEcologyModal(true)}
          className={clsx(
            'rounded-[6px]',
            'py-[10px] px-[15px]',
            'flex items-center justify-between',
            'cursor-pointer',
            'bg-r-neutral-bg-1'
          )}
          style={{
            backgroundImage:
              'linear-gradient(91deg, rgba(80, 174, 119, 0.15) 3.82%, rgba(212, 122, 85, 0.15) 98.95%)',
          }}
        >
          <div className={clsx('flex items-center space-x-[9px]')}>
            <RCIconEco />
            <span
              className="text-15 font-semibold"
              style={{
                background: ' linear-gradient(90deg, #50AD77 0%, #D57A55 100%)',
                backgroundClip: 'text',
                webkitBackgroundClip: 'text',
                webkitTextFillColor: 'transparent',
              }}
            >
              Ecosystem
            </span>
          </div>
          <RcIconArrowCCRight className="text-r-neutral-foot" />
        </div>
      </div>

      <div
        className={clsx('ecology-modal z-10', {
          show: isVisible,
          hidden: !isShowEcology,
        })}
      >
        <PageHeader
          forceShowBack
          onBack={handleCancel}
          className="bg-neutral-bg1 sticky top-0"
        >
          {t('page.dashboard.recentConnection.title')}
        </PageHeader>
        <EcologyContent />
      </div>
    </>
  );
};
