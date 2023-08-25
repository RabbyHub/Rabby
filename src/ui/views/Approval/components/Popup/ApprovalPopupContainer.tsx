import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FooterResend } from './FooterResend';
import { FooterButton } from './FooterButton';
import { FooterResendCancelGroup } from './FooterResendCancelGroup';
import TXWaitingSVG from 'ui/assets/approval/tx-waiting.svg';
import TxFailedSVG from 'ui/assets/approval/tx-failed.svg';
import TxSucceedSVG from 'ui/assets/approval/tx-succeed.svg';
import ConnectWiredSVG from 'ui/assets/approval/connect-wired.svg';
import ConnectWirelessSVG from 'ui/assets/approval/connect-wireless.svg';
import ConnectQRCodeSVG from 'ui/assets/approval/connect-qrcode.svg';
import { noop } from '@/ui/utils';
import { FooterDoneButton } from './FooterDoneButton';
import { Dots } from './Dots';

export interface Props {
  hdType: 'wired' | 'wireless' | 'qrcode' | 'privatekey';
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
  showAnimation?: boolean;
}

export const ApprovalPopupContainer: React.FC<Props> = ({
  hdType,
  status,
  content,
  description,
  onRetry = noop,
  onDone = noop,
  onCancel = noop,
  onSubmit = noop,
  hasMoreDescription,
  children,
  showAnimation,
}) => {
  const [image, setImage] = React.useState('');
  const [iconColor, setIconColor] = React.useState('');
  const [contentColor, setContentColor] = React.useState('');
  const { t } = useTranslation();

  const sendUrl = React.useMemo(() => {
    switch (hdType) {
      case 'wired':
        return ConnectWiredSVG;
      case 'wireless':
        return ConnectWirelessSVG;
      case 'privatekey':
        return;
      case 'qrcode':
      default:
        return ConnectQRCodeSVG;
    }
  }, [hdType]);

  React.useEffect(() => {
    switch (status) {
      case 'SENDING':
        setImage('');
        setIconColor('bg-blue-light');
        setContentColor('text-gray-title');
        break;
      case 'WAITING':
      case 'SUBMITTING':
        setImage('');
        setIconColor('bg-blue-light');
        setContentColor('text-gray-title');
        break;
      case 'FAILED':
      case 'REJECTED':
        setImage(TxFailedSVG);
        setIconColor('bg-red-forbidden');
        setContentColor('text-red-forbidden');
        break;
      case 'RESOLVED':
        setImage(TxSucceedSVG);
        setIconColor('bg-green');
        setContentColor('text-green');
        break;
      default:
        break;
    }
  }, [status]);

  return (
    <div className={clsx('flex flex-col items-center', 'relative flex-1')}>
      {sendUrl ? (
        <div className={clsx('p-10')}>
          <img src={sendUrl} className={'w-[140px] h-[140px]'} />
        </div>
      ) : null}
      <div
        className={clsx(
          'text-[20px] font-medium leading-[24px]',
          contentColor,
          'mt-[24px]',
          'flex items-center'
        )}
      >
        {image ? <img src={image} className="w-20 mr-6" /> : null}
        <span>{content}</span>
        {status === 'SENDING' && showAnimation ? <Dots /> : null}
      </div>
      {/* <div
        className={clsx(
          contentColor,
          hasMoreDescription
            ? 'text-[13px] mt-12 leading-[18px] text-center'
            : 'text-[20px] font-bold'
        )}
      >
        {description}
      </div> */}

      <div className="absolute bottom-0">
        {status === 'SENDING' && <FooterResend onResend={onRetry} />}
        {status === 'WAITING' && <FooterResend onResend={onRetry} />}
        {status === 'FAILED' && <FooterResend onResend={onRetry} />}
        {status === 'RESOLVED' && <FooterDoneButton onDone={onDone} hide />}
        {status === 'REJECTED' && <FooterResend onResend={onRetry} />}
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
