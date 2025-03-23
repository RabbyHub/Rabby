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

export const CustomizedSwitch: React.FC<Props> = ({
  selected,
  onOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex rounded',
        'py-[9px] px-12 bg-orange bg-opacity-20 justify-between mb-[10px]'
      )}
    >
      <div className={clsx('text-orange text-13')}>
        {selected
          ? t('page.dashboard.tokenDetail.selectedCustom')
          : t('page.dashboard.tokenDetail.notSelectedCustom')}
      </div>
      <label className={clsx('flex items-center gap-x-6 cursor-pointer')}>
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
        <span className="text-r-neutral-foot text-12">
          {t('page.dashboard.tokenDetail.customized')}
        </span>
      </label>
    </div>
  );
};
