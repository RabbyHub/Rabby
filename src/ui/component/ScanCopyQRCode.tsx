import React, { useState } from 'react';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import { Input, message } from 'antd';
import { useHover } from 'ui/utils';
import WalletConnectBridgeModal from './WalletConnectBridgeModal';
import IconSuccess from 'ui/assets/success.svg';
import IconBridgeChange from 'ui/assets/bridgechange.svg';
import IconQRCodeRefresh from 'ui/assets/qrcoderefresh.svg';
import IconCopy from 'ui/assets/urlcopy.svg';
import IconRefresh from 'ui/assets/urlrefresh.svg';

interface Props {
  showURL: boolean;
  changeShowURL: (active: boolean) => void;
  refreshFun(): void;
  qrcodeURL: string;
  onBridgeChange(val: string): void;
  bridgeURL: string;
  defaultBridge: string;
}
const ScanCopyQRCode: React.FC<Props> = ({
  showURL = false,
  changeShowURL,
  qrcodeURL,
  refreshFun,
  onBridgeChange,
  bridgeURL,
  defaultBridge,
}) => {
  const [isHovering, hoverProps] = useHover();
  const { t } = useTranslation();
  const [copySuccess, setCopySuccess] = useState(false);
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);

  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS('.wallet-connect', {
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

  return (
    <div>
      <div className="button-container">
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
        <div className="qrcode" {...hoverProps}>
          <QRCode value={qrcodeURL} size={170} />
          {isHovering && (
            <div className="refresh-container">
              <img
                className="qrcode-refresh"
                src={IconQRCodeRefresh}
                onClick={refreshFun}
              />
            </div>
          )}
        </div>
      )}
      {showURL && (
        <div className="url-container">
          <Input.TextArea
            className="h-[200px] w-[336px] p-16 m-32 mt-0 mb-24"
            spellCheck={false}
            value={qrcodeURL}
          />
          <img
            src={IconRefresh}
            onClick={refreshFun}
            className="icon-refresh-wallet"
          />
          <img
            src={IconCopy}
            onClick={handleCopyCurrentAddress}
            className={clsx('icon-copy-wallet', { success: copySuccess })}
          />
        </div>
      )}
      <div className="change-bridge" onClick={() => setShowOpenApiModal(true)}>
        <img src={IconBridgeChange} />
        {t('Change bridge server')}
      </div>
      <WalletConnectBridgeModal
        defaultValue={defaultBridge}
        value={bridgeURL}
        visible={showOpenApiModal}
        onChange={handleBridgeServerChange}
        onCancel={() => setShowOpenApiModal(false)}
      />
    </div>
  );
};
export default ScanCopyQRCode;
