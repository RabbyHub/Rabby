import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Divide } from '../Divide';

export interface Props {
  onResend: () => void;
  onCancel: () => void;
}

export const FooterResendCancelGroup: React.FC<Props> = ({
  onResend,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Divide className="bg-r-neutral-line" />

      <div className={clsx('flex justify-between py-18 px-20 gap-16')}>
        <Button
          className={clsx(
            'h-[40px] text-blue-light border-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
          block
          type="ghost"
          onClick={onResend}
        >
          {t('page.signFooterBar.resend')}
        </Button>
        <Button
          className={clsx(
            'h-[40px] text-blue-light border-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
          block
          type="ghost"
          onClick={onCancel}
        >
          {t('global.cancelButton')}
        </Button>
      </div>
    </>
  );
};
