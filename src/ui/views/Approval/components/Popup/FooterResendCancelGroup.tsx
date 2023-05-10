import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';

export interface Props {
  onResend: () => void;
  onCancel: () => void;
}

export const FooterResendCancelGroup: React.FC<Props> = ({
  onResend,
  onCancel,
}) => {
  return (
    <div className={clsx('flex gap-[16px]')}>
      <Button className="w-[148px] h-[40px]" type="primary" onClick={onResend}>
        Resend
      </Button>
      <Button
        className="w-[148px] h-[40px] text-blue-light border-blue-light"
        type="ghost"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
};
