import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';

export const IsolateTag: React.FC<{
  className?: string;
  isGlobal?: boolean;
}> = ({ className, isGlobal }) => {
  const { t } = useTranslation();

  return (
    <Tooltip title={t('page.lending.isolateTip')}>
      <span
        className={clsx(
          'text-[12px] font-medium px-[6px] h-[20px] flex items-center gap-[4px] rounded-[4px]',
          'bg-rb-orange-light-1 text-rb-orange-default',
          className
        )}
      >
        {t('page.lending.isolate')}
        <RcIconInfo width={12} height={12} />
      </span>
    </Tooltip>
  );
};
