import React, { useState } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import { Input, message } from 'antd';
import WalletConnectBridgeModal from './WalletConnectBridgeModal';
import IconSuccess from 'ui/assets/success.svg';
import IconBridgeChange from 'ui/assets/bridgechange.svg';
import IconQRCodeRefresh from 'ui/assets/qrcoderefresh.svg';
import IconCopy from 'ui/assets/urlcopy.svg';
import IconRefresh from 'ui/assets/urlrefresh.svg';
import { ConnectStatus } from './WalletConnect/ConnectStatus';
import { useSessionStatus } from './WalletConnect/useSessionStatus';
import { Account } from '@/background/service/preference';

interface Props {
  showURL: boolean;
  changeShowURL: (active: boolean) => void;
  refreshFun(): void;
  qrcodeURL: string;
  onBridgeChange(val: string): void;
  bridgeURL: string;
  defaultBridge: string;
  canChangeBridge?: boolean;
  brandName?: string;
  account?: Account;
}
const ScanCopyQRCode: React.FC<Props> = ({
  showURL = false,
  changeShowURL,
  qrcodeURL,
  refreshFun,
  onBridgeChange,
  bridgeURL,
  defaultBridge,
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
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const handleBridgeServerChange = (val: string) => {
    onBridgeChange(val);
    setShowOpenApiModal(false);
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
          {t('QR code')}
        </div>
        <div
          className={clsx('cursor-pointer', { active: showURL })}
          onClick={() => changeShowURL(true)}
        >
          {t('URL')}
        </div>
      </div>
      {!showURL && (
        <div className="qrcode mb-0" {...hoverProps}>
          <QRCode value={qrcodeURL} size={170} />
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
            className="h-[200px] w-[336px] p-16 block"
            spellCheck={false}
            value={qrcodeURL}
            disabled={true}
          />
          <img
            src={IconRefresh}
            onClick={refreshFun}
            className="icon-refresh-wallet cursor-pointer"
          />
          <img
            src={IconCopy}
            onClick={handleCopyCurrentAddress}
            className={clsx('icon-copy-wallet cursor-pointer', {
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
          {t('Change bridge server')}
        </div>
      )}
      <WalletConnectBridgeModal
        defaultValue={defaultBridge}
        value={bridgeURL}
        visible={showOpenApiModal}
        onChange={handleBridgeServerChange}
        onCancel={() => setShowOpenApiModal(false)}
      />
      <ConnectStatus account={account} uri={qrcodeURL} brandName={brandName} />
    </div>
  );
};
export default ScanCopyQRCode;
