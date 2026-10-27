import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import browser from 'webextension-polyfill';
import { createQueryKey } from '@/ui/query/queryKey';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/new-user-import/triangle.svg';
import UserGuide1 from '@/ui/assets/new-user-import/guide-1.png';
import UserGuide2 from '@/ui/assets/new-user-import/guide-2.png';
import { ReactComponent as UserGuide1Icon } from '@/ui/assets/new-user-import/guide1.svg';
import { ReactComponent as UserGuide2Icon } from '@/ui/assets/new-user-import/guide2.svg';

export const PinGuideTips = () => {
  const { t } = useTranslation();

  // undefined while loading; false when unknown (e.g. MV2 has no browser.action)
  const { data: isPinned } = useQuery({
    queryKey: createQueryKey('actionUserSettings'),
    queryFn: async () => {
      if (!browser.action?.getUserSettings) {
        return false;
      }
      return browser.action
        .getUserSettings()
        .then((settings) => !!settings.isOnToolbar)
        .catch(() => false);
    },
  });

  if (isPinned !== false) {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed top-[40px] right-[90px]',
        'w-[242px] h-[300px]',
        'py-12 px-12',
        'bg-r-neutral-card-1 rounded-[12px]'
      )}
    >
      <RcIconTriangle className="absolute top-[-39px] right-[22px]" />
      <div className="flex flex-col gap-[11px]">
        <div className="flex flex-col">
          <div className="flex items-center">
            <UserGuide1Icon className="w-[20px] h-[20px] mr-[5px]" />
            <span className="text-[12px] font-semibold text-r-neutral-title1">
              {t('page.newUserImport.readyToUse.guides.step1')}
            </span>
          </div>
          <img
            src={UserGuide1}
            alt="user-guide-1"
            className="w-[186px] h-[96px] mt-[10px] ml-[25px]"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center">
            <UserGuide2Icon className="w-[20px] h-[20px] mr-[5px]" />
            <span className="text-[12px] font-semibold text-r-neutral-title1">
              {t('page.newUserImport.readyToUse.guides.step2')}
            </span>
          </div>
          <img
            src={UserGuide2}
            alt="user-guide-2"
            className="w-[183px] h-[114px] mt-[10px] ml-[25px]"
          />
        </div>
      </div>
    </div>
  );
};
