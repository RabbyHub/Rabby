import clsx from 'clsx';
import React from 'react';

export interface Props {
  onResend: () => void;
}

export const FooterResend: React.FC<Props> = ({ onResend }) => {
  return (
    <div
      className={clsx(
        'text-[15px] underline text-gray-subTitle font-medium',
        'cursor-pointer'
      )}
      onClick={onResend}
    >
      Resend
    </div>
  );
};
