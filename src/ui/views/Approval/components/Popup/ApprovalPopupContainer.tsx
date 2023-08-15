import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FooterDoneButton } from './FooterDoneButton';
import { FooterResend } from './FooterResend';
import { FooterButton } from './FooterButton';
import { FooterResendCancelGroup } from './FooterResendCancelGroup';

import TXWaitingSVG from 'ui/assets/approval/tx-waiting.svg';
import TXErrorSVG from 'ui/assets/approval/tx-error.svg';
import TXSubmittedSVG from 'ui/assets/approval/tx-submitted.svg';
import { noop } from '@/ui/utils';

export interface Props {
  brandUrl: string;
  status:
    | 'SENDING'
    | 'WAITING'
    | 'RESOLVED'
    | 'REJECTED'
    | 'FAILED'
    | 'SUBMITTING';
  content: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  onDone?: () => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  hasMoreDescription?: boolean;
  children?: React.ReactNode;
}

export const ApprovalPopupContainer: React.FC<Props> = ({
  brandUrl,
  status,
  content,
  description,
  onRetry = noop,
  onDone = noop,
  onCancel = noop,
  onSubmit = noop,
  hasMoreDescription,
  children,
}) => {
  const [image, setImage] = React.useState('');
  const [iconColor, setIconColor] = React.useState('');
  const [contentColor, setContentColor] = React.useState('');
  const { t } = useTranslation();

  React.useEffect(() => {
    switch (status) {
      case 'SENDING':
        setImage('/images/tx-sending.gif');
        setIconColor('bg-blue-light');
        setContentColor('text-gray-title');
        break;
      case 'WAITING':
      case 'SUBMITTING':
        setImage(TXWaitingSVG);
        setIconColor('bg-blue-light');
        setContentColor('text-gray-title');
        break;
      case 'FAILED':
      case 'REJECTED':
        setImage(TXErrorSVG);
        setIconColor('bg-red-forbidden');
        setContentColor('text-red-forbidden');
        break;
      case 'RESOLVED':
        setImage(TXSubmittedSVG);
        setIconColor('bg-green');
        setContentColor('text-gray-title');
        break;
      default:
        break;
    }
  }, [status]);

  return (
    <div
      className={clsx(
        'flex flex-col items-center',
        'relative flex-1',
        hasMoreDescription ? 'mt-4' : 'mt-20'
      )}
    >
      <div
        className={clsx(
          'w-[80px] h-[80px] rounded-full',
          'border-[#E5E9EF] border-[2px]',
          'relative'
        )}
      >
        <img src={brandUrl} className={'w-full h-full'} />
        <div
          className={clsx(
            'w-[32px] h-[32px] rounded-full',
            'absolute bottom-[-6px] right-[-6px]',
            'border border-[#E5E9EF]',
            iconColor,
            'flex'
          )}
        >
          <img src={image} className={'m-auto'} />
        </div>
      </div>
      <div
        className={clsx(
          'text-[20px] font-bold leading-[24px]',
          contentColor,
          hasMoreDescription ? 'mt-[24px]' : 'mt-[40px]'
        )}
      >
        {content}
      </div>
      <div
        className={clsx(
          contentColor,
          hasMoreDescription
            ? 'text-[13px] mt-12 leading-[18px] text-center'
            : 'text-[20px] font-bold'
        )}
      >
        {description}
      </div>

      <div className="absolute bottom-[10px]">
        {status === 'SENDING' && <FooterResend onResend={onRetry} />}
        {status === 'WAITING' && <FooterResend onResend={onRetry} />}
        {status === 'FAILED' && (
          <FooterButton
            text={t('page.signFooterBar.resend')}
            onClick={onRetry}
          />
        )}
        {status === 'RESOLVED' && <FooterDoneButton onDone={onDone} />}
        {status === 'REJECTED' && (
          <FooterResendCancelGroup onResend={onRetry} onCancel={onCancel} />
        )}
        {status === 'SUBMITTING' && (
          <FooterButton
            text={t('page.signFooterBar.submitTx')}
            onClick={onSubmit}
          />
        )}
      </div>
      {children}
    </div>
  );
};
