import React from 'react';
import { useTranslation } from 'react-i18next';

export const ReachedEnd = () => {
  const { t } = useTranslation();
  return (
    <div className="pt-[16px] pb-[80px] flex justify-center items-center gap-[8px]">
      <div className="h-[0.5px] bg-r-neutral-line w-[40px]"></div>
      <div className="text-rb-neutral-secondary text-[13px] leading-[16px]">
        {t('page.desktopProfile.ReachedEnd.content')}
      </div>
      <div className="h-[0.5px] bg-r-neutral-line w-[40px]"></div>
    </div>
  );
};
