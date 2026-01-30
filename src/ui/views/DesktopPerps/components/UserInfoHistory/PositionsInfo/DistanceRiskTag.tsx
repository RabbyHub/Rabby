import { Tooltip } from 'antd';
import { ReactComponent as RcIconAlarmCC } from '@/ui/assets/perps/icon-alarm-cc.svg';
import React from 'react';
import { useTranslation } from 'react-i18next';
export const DistanceRiskTag = ({
  isLong,
  percent,
}: {
  isLong: boolean;
  percent: string;
}) => {
  const { t } = useTranslation();

  return (
    <Tooltip
      overlayClassName="rectangle"
      title={
        isLong
          ? t('page.perpsPro.userInfo.distanceRiskTag.goingDown', { percent })
          : t('page.perpsPro.userInfo.distanceRiskTag.goingUp', { percent })
      }
    >
      <div className="flex items-center justify-center gap-[2px] border border-rb-neutral-line rounded-[4px] h-[18px] px-[4px]">
        <RcIconAlarmCC className="text-rb-neutral-info" />
        <div className="text-rb-neutral-foot font-510 text-[11px] leading-[14px]">
          {percent}
        </div>
      </div>
    </Tooltip>
  );
};
