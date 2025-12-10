import { Switch } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const LpTokenSwitchWrapper = styled.div`
  width: fit-content;
  .ant-switch-checked {
    background-color: var(--r-green-default) !important;
  }
`;

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
    <LpTokenSwitchWrapper
      className={clsx('flex items-center gap-[6px]', className)}
    >
      <Switch checked={lpTokenMode} onChange={onLpTokenModeChange} />
      <div className="text-[14px] leading-[16px] font-normal text-rb-neutral-body whitespace-nowrap">
        {t('page.desktopProfile.portfolio.headers.lpToken')}
      </div>
    </LpTokenSwitchWrapper>
  );
};
