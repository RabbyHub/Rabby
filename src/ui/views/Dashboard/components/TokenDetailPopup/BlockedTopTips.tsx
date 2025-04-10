import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Switch } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const SwitchStyled = styled(Switch)`
  &.ant-switch-checked {
    background-color: #2abb7f;
  }

  &.ant-switch-small {
    min-width: 32px;
    height: 16px;
    line-height: 16px;
  }

  &.ant-switch-small .ant-switch-handle {
    width: 14px;
    height: 14px;
    top: 1px;
    left: 1px;
  }

  &.ant-switch-small.ant-switch-checked .ant-switch-handle {
    left: 16px;
  }
`;

interface Props {
  isAdded?: boolean;
  onOpen(): void;
  onClose(): void;
  token: TokenItem;
}
export const BlockedTopTips = ({ onOpen, onClose, isAdded, token }: Props) => {
  const { t } = useTranslation();

  const isCustomizedHasAdded = useMemo(() => {
    return !token.is_core && isAdded;
  }, [token, isAdded]);

  return isAdded ? (
    <div className="flex flex-row bg-r-neutral-card-1 rounded-[8px] px-16 py-12 items-center justify-between gap-20">
      <div
        className="text-r-neutral-body text-13"
        style={{
          lineHeight: 'normal',
          fontWeight: 500,
        }}
      >
        {!token.is_core
          ? t('page.dashboard.tokenDetail.customizedHasAddedTips')
          : t('page.dashboard.tokenDetail.blockedTips')}
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
