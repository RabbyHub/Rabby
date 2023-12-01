import React from 'react';
import { ReactComponent as SkeletonHistorySVG } from '@/ui/assets/dashboard/skeleton-history.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export const HistoryList: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={clsx('flex flex-col text-center', 'gap-y-20 mt-[80px]')}>
      <SkeletonHistorySVG className="m-auto" />
      <div className="text-15 text-r-neutral-foot font-medium">
        {t('page.dashboard.assets.comingSoon')}
      </div>
    </div>
  );
};
