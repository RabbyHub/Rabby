import React from 'react';
import clsx from 'clsx';
import { SvgIconLoading } from 'ui/assets';
import { useTranslation } from 'react-i18next';

const LoadingOverlay = ({ hidden }: { hidden: boolean }) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'fixed left-0 top-0 z-[999] w-[100vw] h-[100vh] bg-[rgba(240,242,245,0.5)] [transition:overlay_0.3s]',
        hidden ? 'hidden opacity-0' : 'opacity-100'
      )}
    >
      <div className="absolute left-1/2 top-1/2 [transform:translate(-50%,-50%)] flex flex-col items-center">
        <SvgIconLoading className="icon icon-loading mb-16 animate-[spining_1.5s_infinite] [&_path]:fill-[#707280]" />
        <p className="mb-0 font-medium text-15 text-[#707280]">
          {t('component.LoadingOverlay.loadingData')}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
