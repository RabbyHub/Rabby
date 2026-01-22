import { Button } from 'antd';
import clsx from 'clsx';
import React, { SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Divide } from '../Divide';
import type { RetryUpdateType } from '@/background/utils/errorTxRetry';

export interface Props {
  onResend: () => void;
  onCancel: () => void;
  retryUpdateType?: RetryUpdateType;
  brandIcon?: React.FC<SVGProps<any>> | null;
}

export const FooterResendCancelGroup: React.FC<Props> = ({
  onResend,
  onCancel,
  retryUpdateType = 'origin',
  brandIcon: BrandIcon,
}) => {
  const { t } = useTranslation();

  if (!retryUpdateType) {
    return (
      <>
        <Divide className="bg-r-neutral-line" />
        <div className={clsx('flex justify-between py-18 px-20 gap-16')}>
          <Button
            className={clsx('h-[48px]', 'before:content-none')}
            block
            type="primary"
            onClick={onCancel}
          >
            {t('page.signFooterBar.iGotIt')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Divide className="bg-r-neutral-line" />

      <div className={clsx('flex justify-between py-18 px-20 gap-16')}>
        <Button
          className={clsx(
            'h-[48px] text-blue-light border-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
          block
          type="ghost"
          onClick={onCancel}
        >
          {t('global.cancelButton')}
        </Button>

        <Button
          className={clsx('h-[48px]', 'before:content-none')}
          block
          type="primary"
          onClick={onResend}
        >
          {BrandIcon ? (
            <div className="flex items-center gap-[8px] justify-center">
              <BrandIcon width={22} height={22} viewBox="0 0 28 28" />
              <div>{t('page.signFooterBar.resend')}</div>
            </div>
          ) : (
            t('page.signFooterBar.resend')
          )}
        </Button>
      </div>
    </>
  );
};
