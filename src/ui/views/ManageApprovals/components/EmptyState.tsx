import React from 'react';
import { Button, Empty } from 'antd';
import { RcIconFindCC } from '@/ui/assets/desktop/common';

type EmptyStateProps = {
  text: string;
  onReset?: () => void;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ text, onReset }) => {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-[12px] text-r-neutral-foot">
      <div className="flex flex-col gap-[8px] items-center justify-center">
        <RcIconFindCC viewBox="0 0 14 14" className="w-[36px] h-[36px]" />
        <div className="text-[13px] leading-[16px]">{text}</div>
      </div>
      {onReset ? (
        <Button
          type="link"
          onClick={onReset}
          className="px-0 font-bold text-r-blue-default"
        >
          Review All approvals
        </Button>
      ) : null}
    </div>
  );
};
