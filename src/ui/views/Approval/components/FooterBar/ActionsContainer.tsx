import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';

export interface Props {
  onClickCancel(): void;
  children: React.ReactNode;
}

export const ActionsContainer: React.FC<Props> = ({
  children,
  onClickCancel,
}) => {
  return (
    <div className="flex items-center gap-[16px]">
      {children}
      <Button
        type="ghost"
        className={clsx(
          'w-[100px] h-[48px] border-blue-light text-blue-light',
          'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
          'rounded-[8px]',
          'before:content-none'
        )}
        onClick={onClickCancel}
      >
        Cancel
      </Button>
    </div>
  );
};
