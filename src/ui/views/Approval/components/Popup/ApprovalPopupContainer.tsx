import clsx from 'clsx';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FooterResend } from './FooterResend';
import { FooterButton } from './FooterButton';
import { FooterResendCancelGroup } from './FooterResendCancelGroup';
import TxSucceedSVG from 'ui/assets/approval/tx-succeed.svg';
import ConnectWiredSVG from 'ui/assets/approval/connect-wired.svg';
import ConnectWirelessSVG from 'ui/assets/approval/connect-wireless.svg';
import ConnectQRCodeSVG from 'ui/assets/approval/connect-qrcode.svg';
import ConnectWalletConnectSVG from 'ui/assets/approval/connect-walletconnect.svg';
import { noop, useCommonPopupView } from '@/ui/utils';
import { FooterDoneButton } from './FooterDoneButton';
import { Dots } from './Dots';
import type { RetryUpdateType } from '@/background/utils/errorTxRetry';
import TxWarnSVG from '@/ui/assets/info-warn.svg';
import TxErrorSVG from '@/ui/assets/info-error.svg';

const PRIVATE_KEY_ERROR_HEIGHT = 247;
const OTHER_ERROR_HEIGHT = 392;

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
  retryUpdateType = 'origin',
}) => {
  const [image, setImage] = React.useState('');
  const [iconColor, setIconColor] = React.useState('');
  const [contentColor, setContentColor] = React.useState('');
  const { t } = useTranslation();
  const { setTitle } = useCommonPopupView();

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

  // const lastNormalHeight = React.useRef(0);

  // React.useEffect(() => {
  //   if (
  //     height !== lastNormalHeight.current &&
  //     height !== OTHER_ERROR_HEIGHT &&
  //     height !== PRIVATE_KEY_ERROR_HEIGHT
  //   ) {
  //     lastNormalHeight.current = height;
  //   }
  // }, [height]);

  // React.useEffect(() => {
  //   if (status === 'FAILED' || status === 'REJECTED') {
  //     if (hdType === 'privatekey') {
  //       setHeight(PRIVATE_KEY_ERROR_HEIGHT);
  //     } else {
  //       setHeight(OTHER_ERROR_HEIGHT);
  //     }
  //   } else {
  //     setHeight(lastNormalHeight.current);
  //   }
  // }, [setHeight, hdType, status]);

  const isFailedOrRejected = status === 'FAILED' || status === 'REJECTED';

  const showSendSvg = !isFailedOrRejected;

  const originTitleRef = React.useRef<React.ReactNode>(null);

  useEffect(() => {
    if (isFailedOrRejected) {
      setTitle((pre) => {
        if (pre && !originTitleRef.current) {
          originTitleRef.current = pre;
        }
        return <div>{null}</div>;
      });
    } else {
      if (originTitleRef.current) {
        setTitle(originTitleRef.current);
      }
    }
  }, [isFailedOrRejected, retryUpdateType]);

  return (
    <div
      className={clsx(
        'flex flex-col items-center',
        'flex-1',
        // reduce body padding top
        isFailedOrRejected ? '-mt-16' : ''
      )}
    >
      {sendUrl && showSendSvg ? (
        <img src={sendUrl} className={'w-[160px] h-[160px]'} />
      ) : null}
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
          "px-20'",
          'overflow-auto w-full'
        )}
      >
        {description}
      </div>

      <div className="w-[calc(100%+32px)] relative -mb-16">
        <div className="text-center">
          {status === 'SENDING' && <FooterResend onResend={onRetry} />}
          {status === 'WAITING' && <FooterResend onResend={onRetry} />}
          {status === 'FAILED' && (
            <FooterResendCancelGroup
              onCancel={onCancel}
              onResend={onRetry}
              retryUpdateType={retryUpdateType}
            />
          )}
          {status === 'RESOLVED' && <FooterDoneButton onDone={onDone} hide />}
          {status === 'REJECTED' && (
            <FooterResendCancelGroup
              onCancel={onCancel}
              onResend={onRetry}
              retryUpdateType={retryUpdateType}
            />
          )}
          {status === 'SUBMITTING' && (
            <FooterButton
              text={t('page.signFooterBar.submitTx')}
              onClick={onSubmit}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
