import React from 'react';
import { ReactComponent as SkeletonSummarySVG } from '@/ui/assets/dashboard/skeleton-summary.svg';
import clsx from 'clsx';

export const SummaryList: React.FC = () => {
  return (
    <div className={clsx('flex flex-col text-center', 'gap-y-20 mt-[80px]')}>
      <SkeletonSummarySVG className="m-auto" />
      <div className="text-15 text-gray-comment font-medium">
        Coming Soon...
      </div>
    </div>
  );
};
