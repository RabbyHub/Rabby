import { Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/ui/utils/cn';
import styles from './LpTokenSwitch.module.css';

export const LpTokenSwitch = ({
  lpTokenMode,
  onLpTokenModeChange,
  className,
}: {
  lpTokenMode?: boolean;
  onLpTokenModeChange?: (v: boolean) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        styles.lpTokenSwitchWrapper,
        'flex items-center gap-[6px]',
        className
      )}
    >
      <Switch checked={lpTokenMode} onChange={onLpTokenModeChange} />
      <div className="text-[14px] leading-[16px] font-normal text-rb-neutral-body whitespace-nowrap">
        {t('page.desktopProfile.portfolio.headers.lpToken')}
      </div>
    </div>
  );
};
