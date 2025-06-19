import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import ClickableStar from './ClickableStar';
import { ReactComponent as RabbySilhouette } from './icons/rabby-silhouette.svg';
import { useExposureRateGuide, useRateModal } from './hooks';

const StarLayoutSizes = {
  size: 32,
  gap: 20,
  paddingHorizontal: 8 / 2,
};

export default function RateModalTriggerOnSettings({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const { shouldShowRateGuideOnHome } = useExposureRateGuide();
  const { toggleShowRateModal } = useRateModal();

  const [userSelectedStar, setUserSelectedStar] = useState(0);

  if (!shouldShowRateGuideOnHome) return null;

  return (
    <div
      style={{ height: '90px' }}
      className={clsx(
        'flex items-center justify-center flex-col',
        'max-w-[360px] w-[100%] bg-r-blue-light-1 rounded-[6px]',
        'relative',
        className
      )}
    >
      <div className="absolute self-center left-0">
        <RabbySilhouette height={90} />
      </div>
      <span className="text-[15px] text-r-neutral-title-1 text-[600]">
        {t('page.dashboard.settings.rateModalTriggerOnHome.description')}
      </span>
      <div
        className="flex items-center justify-center mt-[8px] group"
        style={{
          gap: StarLayoutSizes.gap - StarLayoutSizes.paddingHorizontal * 2,
        }}
        onMouseLeave={(evt) => {
          evt.stopPropagation();
          setUserSelectedStar(0);
        }}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <ClickableStar
            key={`star-${index}`}
            isFilled={userSelectedStar >= index + 1}
            className="h-[32px]"
            style={{
              width:
                StarLayoutSizes.size + StarLayoutSizes.paddingHorizontal * 2,
              paddingLeft: StarLayoutSizes.paddingHorizontal,
              paddingRight: StarLayoutSizes.paddingHorizontal,
              boxSizing: 'border-box',
            }}
            onMouseEnter={(evt) => {
              evt.stopPropagation();
              setUserSelectedStar(index + 1);
            }}
            onClick={(evt) => {
              evt.stopPropagation();
              toggleShowRateModal(true, {
                starCountOnOpen: index + 1,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
