import clsx from 'clsx';
import React from 'react';
import IconEmpty from '@/ui/assets/pending/empty.svg';
import { useTranslation } from 'react-i18next';

export const Empty = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx('flex items-center justify-center py-[100px]', className)}
    >
      <div className="text-center">
        <img src={IconEmpty} className="inline-block" alt="" />
        <div className="text-r-neutral-body text-[15px] leading-[18px] mt-[13px]">
          {t('page.pendingDetail.Empty.noData')}
        </div>
      </div>
    </div>
  );
};
