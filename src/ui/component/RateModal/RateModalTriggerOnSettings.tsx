import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ReactComponent as RcIconCloseCC } from './icons/close-cc.svg';
// import { ReactComponent as RcIconCloseCC } from '@/ui/assets/component/close-cc.svg';
import { ReactComponent as RabbySilhouette } from './icons/rabby-silhouette.svg';

import ClickableStar from './ClickableStar';
import { useExposureRateGuide, useRateModal } from './hooks';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';

const StarLayoutSizes = {
  size: 32,
  gap: 20,
  paddingHorizontal: 8 / 2,
};

function starToText(number: number) {
  switch (number) {
    case 1:
      return 'One';
    case 2:
      return 'Two';
    case 3:
      return 'Three';
    case 4:
      return 'Four';
    case 5:
      return 'Five';
    default:
      return 'Unknown';
  }
}

export default function RateModalTriggerOnSettings({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const { shouldShowRateGuideOnHome } = useExposureRateGuide();
  const { toggleShowRateModal } = useRateModal();

  const [userSelectedStar, setUserSelectedStar] = useState(0);

  useEffect(() => {
    if (!shouldShowRateGuideOnHome) return;

    matomoRequestEvent({ category: 'Rate Rabby', action: 'Rate_Show' });
    ga4.fireEvent('Rate_Show', { event_category: 'Rate Rabby' });
  }, [shouldShowRateGuideOnHome]);

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
        className="absolute w-[28px] h-[28px] pr-[8px] pt-[8px] right-0 top-0 cursor-pointer"
        onClick={() =>
          toggleShowRateModal(false, {
            disableExposureOnClose: true,
          })
        }
      >
        <RcIconCloseCC className="text-r-neutral-foot w-[20px] h-[20px]" />
      </div>
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
              matomoRequestEvent({
                category: 'Rate Rabby',
                action: `Rate_Star_${starToText(userSelectedStar)}`,
              });
              ga4.fireEvent(`Rate_Star_${starToText(userSelectedStar)}`, {
                event_category: 'Rate Rabby',
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
