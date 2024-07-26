import React, { useState } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import { Input, message } from 'antd';
import IconSuccess from 'ui/assets/success.svg';
import IconBridgeChange from 'ui/assets/bridgechange.svg';
import IconQRCodeRefresh from 'ui/assets/qrcoderefresh.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/urlcopy.svg';
import { ReactComponent as RcIconRefresh } from 'ui/assets/urlrefresh.svg';
import { ConnectStatus } from './WalletConnect/ConnectStatus';
import { useSessionStatus } from './WalletConnect/useSessionStatus';
import { Account } from '@/background/service/preference';
import Spin from './Spin';
import ThemeIcon from './ThemeMode/ThemeIcon';

interface Props {
  showURL: boolean;
  changeShowURL: (active: boolean) => void;
  refreshFun(): void;
  qrcodeURL: string;
  canChangeBridge?: boolean;
  brandName?: string;
  account?: Account;
}
const ScanCopyQRCode: React.FC<Props> = ({
  showURL = false,
  changeShowURL,
  qrcodeURL,
  refreshFun,
  canChangeBridge = true,
  brandName,
  account,
}) => {
  // Disable hover
  // const [isHovering, hoverProps] = useHover();
  const isHovering = false;
  const hoverProps = {};
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState(false);
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const { status } = useSessionStatus(account);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS(rootRef.current!, {
      text: function () {
        return qrcodeURL;
      },
    });

    clipboard.on('success', () => {
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  React.useEffect(() => {
    // refresh when status is not connected
    if (status && status !== 'CONNECTED') {
      refreshFun();
    }
  }, [status]);

  return (
    <div ref={rootRef}>
      <div className="button-container mt-32 mb-24">
        <div
          className={clsx('cursor-pointer', { active: !showURL })}
          onClick={() => changeShowURL(false)}
        >
          {t('page.newAddress.walletConnect.qrCode')}
        </div>
        <div
          className={clsx('cursor-pointer', { active: showURL })}
          onClick={() => changeShowURL(true)}
        >
          {t('page.newAddress.walletConnect.url')}
        </div>
      </div>
      {!showURL && (
        <div className="qrcode mb-0 relative" {...hoverProps}>
          {!qrcodeURL ? (
            <div
              className={clsx(
                'bg-white bg-opacity-70 absolute inset-0',
                'flex items-center justify-center'
              )}
            >
              <Spin />
            </div>
          ) : (
            <QRCode value={qrcodeURL} size={170} />
          )}
          {isHovering && (
            <div className="refresh-container">
              <div className="refresh-wrapper">
                <img
                  className="qrcode-refresh"
                  src={IconQRCodeRefresh}
                  onClick={refreshFun}
                />
              </div>
            </div>
          )}
        </div>
      )}
      {showURL && (
        <div className="url-container mx-auto w-[336px] mt-0 mb-0">
          <Input.TextArea
            className="h-[200px] w-[336px] p-16 block bg-r-neutral-bg-1 rounded-[8px]"
            spellCheck={false}
            value={qrcodeURL}
            disabled={true}
            prefixCls="url-container-textarea"
          />
          <ThemeIcon
            src={RcIconRefresh}
            onClick={refreshFun}
            className="w-16 h-16 icon-refresh-wallet cursor-pointer"
          />
          <ThemeIcon
            src={RcIconCopy}
            onClick={handleCopyCurrentAddress}
            className={clsx('w-16 h-16 icon-copy-wallet cursor-pointer', {
              success: copySuccess,
            })}
          />
        </div>
      )}

      {canChangeBridge && (
        <div
          className="change-bridge"
          onClick={() => setShowOpenApiModal(true)}
        >
          <img src={IconBridgeChange} />
          {t('page.newAddress.walletConnect.changeBridgeServer')}
        </div>
      )}
      <ConnectStatus account={account} uri={qrcodeURL} brandName={brandName} />
    </div>
  );
};
export default ScanCopyQRCode;
