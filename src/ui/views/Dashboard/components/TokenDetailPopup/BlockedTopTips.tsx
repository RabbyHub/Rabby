import { Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const SwitchStyled = styled(Switch)`
  &.ant-switch-checked {
    background-color: #ec5151;
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

interface Props {
  isAdded?: boolean;
  onOpen(): void;
  onClose(): void;
}
export const BlockedTopTips = ({ onOpen, onClose, isAdded }: Props) => {
  const { t } = useTranslation();
  return isAdded ? (
    <div className="flex flex-row bg-r-neutral-card-1 rounded-[8px] px-12 py-16 items-center justify-between">
      <div className="text-r-neutral-body text-13">
        {t('page.dashboard.tokenDetail.blockedTips')}
      </div>
      <SwitchStyled
        size="small"
        checked={isAdded}
        onChange={(val) => {
          if (val) {
            onOpen();
          } else {
            onClose();
          }
        }}
      />
    </div>
  ) : null;
};
