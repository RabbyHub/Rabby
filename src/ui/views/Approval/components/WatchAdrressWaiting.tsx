import React, { useEffect } from 'react';
import { Button } from 'antd';
// import QRCode from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from '@walletconnect/qrcode-modal';
import { Tx } from 'background/service/openapi';
import { useApproval } from 'ui/utils';
import AccountCard from './AccountCard';
import { QrScan } from 'ui/assets';

interface ApprovalParams extends Tx {
  address: string;
}

const WatchAddressWaiting = ({
  params,
  // currently doesn't support
  requestDefer,
}: {
  params: ApprovalParams;
  requestDefer(params: any): void;
}) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  useEffect(() => {
    const connector = new WalletConnect({
      bridge: 'http://192.168.31.109:5555', // Required
      qrcodeModal: QRCodeModal,
    });

    // Check if connection is already established
    if (!connector.connected) {
      // create new session
      connector.createSession();
    }

    // Subscribe to connection events
    connector.on('connect', async (error, payload) => {
      if (error) {
        throw error;
      }
      // Get provided accounts and chainId
      const { accounts, chainId } = payload.params[0];
      if (accounts[0].toLowerCase() !== params.from) {
        alert('not same address');
      }
      const result = await connector.sendTransaction(params);
      console.log('result', result);
      // requestDefer({ pushed: true, result });
      await connector.killSession();
      resolveApproval(result);
    });

    connector.on('session_update', (error, payload) => {
      if (error) {
        throw error;
      }

      // Get updated accounts and chainId
      const { accounts, chainId } = payload.params[0];
    });

    connector.on('disconnect', (error, payload) => {
      if (error) {
        throw error;
      }

      // Delete connector
    });
    // QRCodeModal.open(connector.uri);
  });
  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  return (
    <>
      <AccountCard />
      <div className="watch-operation">
        <img src={QrScan} className="mb-[27px]" />
        {/* <QRCode value={address} size={212} /> */}
        <h1 className="text-15 text-medium text-gray-title text-center mb-[40px] px-[40px]">
          {t('Cannot sign using a watch mode address at this moment')}
        </h1>
        <p className="text-13 text-medium text-gray-content text-center">
          {t('Sign via phone scanning coming soon')}
        </p>
        <footer>
          <div className="action-buttons flex justify-center">
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={handleCancel}
            >
              {t('Cancel')}
            </Button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default WatchAddressWaiting;
