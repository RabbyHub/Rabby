import React, { useEffect, useState } from 'react';
import { Card } from '@/ui/component/NewUserImport';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/new-user-import/triangle.svg';
import HomePreview from '@/ui/assets/new-user-import/home-overview.png';
import UserGuide1 from '@/ui/assets/new-user-import/guide-1.png';
import UserGuide2 from '@/ui/assets/new-user-import/guide-2.png';
import LongArrowPng from '@/ui/assets/new-user-import/long-arrow.png';
import { ReactComponent as UserGuide1Icon } from '@/ui/assets/new-user-import/guide1.svg';
import { ReactComponent as UserGuide2Icon } from '@/ui/assets/new-user-import/guide2.svg';
import { Button } from 'antd';
import { debounce } from 'lodash';

export const ReadyToUse = () => {
  const { t } = useTranslation();

  const homePreviewRef = React.useRef<HTMLImageElement>(null);
  const userGuideRef = React.useRef<HTMLDivElement>(null);
  const [arrowPosition, setArrowPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const caculateArrowPosition = React.useCallback(() => {
    if (homePreviewRef.current && userGuideRef.current) {
      const homePreviewRect = homePreviewRef.current.getBoundingClientRect();
      const userGuideRect = userGuideRef.current.getBoundingClientRect();

      const homePreviewRightMiddle = {
        x: homePreviewRect.right,
        y: homePreviewRect.top + 160,
      };

      const userGuideLeftMiddle = {
        x: userGuideRect.left,
        y: userGuideRect.top + userGuideRect.height / 2,
      };

      const width = userGuideLeftMiddle.x - homePreviewRightMiddle.x;
      const height = Math.abs(userGuideLeftMiddle.y - homePreviewRightMiddle.y);
      const top = Math.min(homePreviewRightMiddle.y, userGuideLeftMiddle.y);
      const left = homePreviewRightMiddle.x;

      setArrowPosition({
        left,
        top,
        width,
        height,
      });
    }
  }, []);

  const debouncedCalculateArrowPosition = React.useMemo(
    () => debounce(caculateArrowPosition, 200),
    [caculateArrowPosition]
  );

  useEffect(() => {
    caculateArrowPosition();
    window.addEventListener('resize', debouncedCalculateArrowPosition);
    return () => {
      window.removeEventListener('resize', debouncedCalculateArrowPosition);
      debouncedCalculateArrowPosition.cancel();
    };
  }, [caculateArrowPosition, debouncedCalculateArrowPosition]);

  return (
    <Card className="mx-[22px]">
      {arrowPosition && (
        <img
          src={LongArrowPng}
          alt="long-arrow"
          className="absolute"
          style={{
            left: `${arrowPosition.left - 10}px`,
            top: `${arrowPosition.top}px`,
            width: `${arrowPosition.width}px`,
            height: `${arrowPosition.height}px`,
            zIndex: 9999,
          }}
        />
      )}
      <div className="flex flex-col items-center">
        <div className="mt-[48px] mb-[11px] text-[28px] text-center w-[400px] font-semibold text-r-neutral-title1">
          {t('page.newUserImport.readyToUse.title')}
        </div>
        <div className="max-w-[320px] text-[18px] font-semibold text-rabby-blue-main text-center">
          {t('page.newUserImport.readyToUse.desc')}
        </div>
        <img
          src={HomePreview}
          ref={homePreviewRef}
          alt="home-preview"
          className="w-[184px] mt-[20px] mb-[21px]"
        />
        <Button
          onClick={() => window.close()}
          block
          type="primary"
          className={clsx(
            'mt-auto h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium'
          )}
        >
          {t('global.Done')}
        </Button>
      </div>

      <div
        className={clsx(
          'fixed top-[40px] right-[90px]',
          'w-[242px] h-[300px]',
          'py-12 px-12',
          'bg-r-neutral-card-1 rounded-[12px]'
        )}
      >
        <RcIconTriangle className="absolute top-[-39px] right-[22px]" />
        <div ref={userGuideRef} className="flex flex-col gap-[11px]">
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
    </Card>
  );
};
