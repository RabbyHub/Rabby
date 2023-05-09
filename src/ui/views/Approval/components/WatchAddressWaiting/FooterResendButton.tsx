import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';

export interface Props {
  onResend: () => void;
}

export const FooterResendButton: React.FC<Props> = ({ onResend }) => {
  return (
    <div>
      <Button className="w-[180px] h-[40px]" type="primary" onClick={onResend}>
        Resend
      </Button>
    </div>
  );
};
