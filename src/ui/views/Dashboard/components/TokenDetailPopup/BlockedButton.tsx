import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Switch } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

export interface Props {
  selected?: boolean;
  onOpen(): void;
  onClose(): void;
}

const SwitchStyled = styled(Switch)`
  &.ant-switch-checked {
    background-color: #2abb7f;
  }

  &.ant-switch-small {
    min-width: 24px;
    height: 12px;
    line-height: 12px;
  }

  &.ant-switch-small .ant-switch-handle {
    width: 10px;
    height: 10px;
    top: 1px;
    left: 1px;
  }

  &.ant-switch-small.ant-switch-checked .ant-switch-handle {
    left: 13px;
  }
`;

export const BlockedButton: React.FC<Props> = ({
  selected,
  onOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <label className={clsx('flex items-center gap-x-6 cursor-pointer')}>
      <div className="relative">
        <TooltipWithMagnetArrow
          overlayClassName="rectangle w-[max-content]"
          title={t('page.dashboard.tokenDetail.blockedTips')}
        >
          <span className="text-r-neutral-foot text-12">
            {t('page.dashboard.tokenDetail.blocked')}
          </span>
        </TooltipWithMagnetArrow>
      </div>
      <SwitchStyled
        size="small"
        checked={selected}
        onChange={(val) => {
          if (val) {
            onOpen();
          } else {
            onClose();
          }
        }}
      />
    </label>
  );
};
