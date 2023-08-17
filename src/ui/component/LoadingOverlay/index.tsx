import React from 'react';
import clsx from 'clsx';
import { SvgIconLoading } from 'ui/assets';
import './style.less';
import { useTranslation } from 'react-i18next';

const LoadingOverlay = ({ hidden }: { hidden: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className={clsx('loading-overlay', { hidden })}>
      <div className="loading-overlay__content">
        <SvgIconLoading className="icon icon-loading" />
        <p>{t('component.LoadingOverlay.loadingData')}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
