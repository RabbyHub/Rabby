import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
    <div className={clsx('flex gap-[16px]')}>
      <Button
        className="w-[148px] h-[40px] text-blue-light border-blue-light"
        type="ghost"
        onClick={onResend}
      >
        {t('page.signFooterBar.resend')}
      </Button>
      <Button
        className="w-[148px] h-[40px] text-blue-light border-blue-light"
        type="ghost"
        onClick={onCancel}
      >
        {t('global.cancelButton')}
      </Button>
    </div>
  );
};
