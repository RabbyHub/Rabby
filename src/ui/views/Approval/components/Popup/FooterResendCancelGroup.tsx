import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface Props {
  onResend: () => void;
  onCancel: () => void;
  retryDisabled?: boolean;
}

export const FooterResendCancelGroup: React.FC<Props> = ({
  onResend,
  onCancel,
  retryDisabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className={clsx('flex gap-[16px]')}>
      <Button
        className={clsx(
          'w-[148px] h-[40px] text-blue-light border-blue-light',
          'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
          'before:content-none'
        )}
        disabled={retryDisabled}
        type="ghost"
        onClick={onResend}
      >
        {t('page.signFooterBar.resend')}
      </Button>
      <Button
        className={clsx(
          'w-[148px] h-[40px] text-blue-light border-blue-light',
          'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
          'before:content-none'
        )}
        type="ghost"
        onClick={onCancel}
      >
        {t('global.cancelButton')}
      </Button>
    </div>
  );
};
