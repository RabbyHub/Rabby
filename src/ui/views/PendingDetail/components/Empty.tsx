import clsx from 'clsx';
import React from 'react';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/pending/empty.svg';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

export const Empty = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx('flex items-center justify-center py-[100px]', className)}
    >
      <div className="text-center">
        <ThemeIcon src={RcIconEmpty} className="inline-block" />
        <div className="text-r-neutral-body text-[15px] leading-[18px] mt-[13px]">
          {t('page.pendingDetail.Empty.noData')}
        </div>
      </div>
    </div>
  );
};
