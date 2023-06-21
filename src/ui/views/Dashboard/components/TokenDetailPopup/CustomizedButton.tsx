import { Switch } from 'antd';
import clsx from 'clsx';
import React from 'react';
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

export const CustomizedButton: React.FC<Props> = ({
  selected,
  onOpen,
  onClose,
}) => {
  return (
    <div
      className={clsx(
        'flex rounded',
        'py-[9px] px-12 bg-orange bg-opacity-20 justify-between mb-[26px]'
      )}
    >
      <div className={clsx('text-orange text-13')}>
        Token is not listed by Rabby. It will be added to the token list if you
        switch on.
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
        <span className="text-black text-12">Customized</span>
      </label>
    </div>
  );
};
