import clsx from 'clsx';
import React, { SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { FooterResendCancelGroup } from './FooterResendCancelGroup';
import TxSucceedSVG from 'ui/assets/approval/tx-succeed.svg';
import ConnectWiredSVG from 'ui/assets/approval/connect-wired.svg';
import ConnectWirelessSVG from 'ui/assets/approval/connect-wireless.svg';
import ConnectQRCodeSVG from 'ui/assets/approval/connect-qrcode.svg';
import ConnectWalletConnectSVG from 'ui/assets/approval/connect-walletconnect.svg';
import { noop } from '@/ui/utils';
import { Dots } from './Dots';
import type { RetryUpdateType } from '@/background/utils/errorTxRetry';
import TxWarnSVG from '@/ui/assets/info-warn.svg';
import TxErrorSVG from '@/ui/assets/info-error.svg';

export interface Props {
  hdType: 'wired' | 'wireless' | 'qrcode' | 'privatekey' | 'walletconnect';
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
  retryUpdateType?: RetryUpdateType;
  brandIcon?: null | React.FC<SVGProps<any>>;
}

export const MiniApprovalPopupContainer: React.FC<Props> = ({
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
  retryUpdateType = 'origin',
  brandIcon,
}) => {
  const [image, setImage] = React.useState('');
  const [iconColor, setIconColor] = React.useState('');
  const [contentColor, setContentColor] = React.useState('');
  const { t } = useTranslation();
  // const { setHeight, height } = useCommonPopupView();

  const sendUrl = React.useMemo(() => {
    switch (hdType) {
      case 'wired':
        return ConnectWiredSVG;
      case 'wireless':
        return ConnectWirelessSVG;
      case 'privatekey':
        return;
      case 'walletconnect':
        return ConnectWalletConnectSVG;
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
        setContentColor('text-r-neutral-title-1');
        break;
      case 'WAITING':
      case 'SUBMITTING':
        setImage('');
        setIconColor('bg-blue-light');
        setContentColor('text-r-neutral-title-1');
        break;
      case 'FAILED':
      case 'REJECTED':
        setImage(retryUpdateType ? TxWarnSVG : TxErrorSVG);
        setIconColor(
          retryUpdateType ? 'bg-r-orange-default' : 'bg-red-forbidden'
        );
        setContentColor('text-r-neutral-title-1');
        break;
      case 'RESOLVED':
        setImage(TxSucceedSVG);
        setIconColor('bg-green');
        setContentColor('text-green');
        break;
      default:
        break;
    }
  }, [status, retryUpdateType]);

  return (
    <div className={clsx('flex flex-col items-center', 'flex-1')}>
      <div
        className={clsx(
          'text-[20px] font-medium leading-[24px]',
          contentColor,
          hasMoreDescription ? 'mt-[14px]' : 'mt-[28px]',
          'flex items-center '
        )}
      >
        {image ? <img src={image} className="w-20 mr-6" /> : null}
        <span>{content}</span>
        {(status === 'SENDING' || status === 'WAITING') && showAnimation ? (
          <Dots />
        ) : null}
      </div>
      <div
        className={clsx(
          // contentColor,
          'text-r-neutral-foot text-[13px] text-center',
          'mt-[12px] mb-[24px]',
          'px-20',
          'overflow-auto w-full'
        )}
      >
        {description}
      </div>

      <div className="w-full text-center">
        {status === 'FAILED' && (
          <FooterResendCancelGroup
            onCancel={onCancel}
            onResend={onRetry}
            brandIcon={brandIcon}
            retryUpdateType={retryUpdateType}
          />
        )}
        {status === 'REJECTED' && (
          <FooterResendCancelGroup
            onCancel={onCancel}
            onResend={onRetry}
            brandIcon={brandIcon}
            retryUpdateType={retryUpdateType}
          />
        )}
      </div>
      {children}
    </div>
  );
};
