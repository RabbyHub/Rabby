import { Button } from 'antd';
import React from 'react';
import { ActionsContainer } from './ActionsContainer';

export interface Props {
  disabledProcess?: boolean;
  onClickProcess(): void;
  onClickCancel(): void;
}

export const SubmitActions: React.FC<Props> = ({
  disabledProcess,
  onClickProcess,
  onClickCancel,
}) => {
  return (
    <ActionsContainer onClickCancel={onClickCancel}>
      <Button
        disabled={disabledProcess}
        type="ghost"
        className="w-[244px] h-[40px] border-blue-light text-blue-light"
        onClick={onClickProcess}
      >
        Begin signing process
      </Button>
    </ActionsContainer>
  );
};
