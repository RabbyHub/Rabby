import React, { useEffect } from 'react';
import { Button } from 'antd';
// import QRCode from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { KEYRING_TYPE } from 'consts';
import QRCodeModal from '@walletconnect/qrcode-modal';
import { Tx } from 'background/service/openapi';
import { useApproval, useWallet } from 'ui/utils';
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
  requestDefer: Promise<any>;
}) => {
  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const handleCancel = () => {
    rejectApproval('user cancel');
  };
  requestDefer.then(resolveApproval).catch(rejectApproval);
  useEffect(() => {
    const keyring = wallet.getKeyringByType(KEYRING_TYPE.WatchAddressKeyring);
    QRCodeModal.open(keyring.walletConnector.uri, () => {
      rejectApproval('user cancel');
    });
  }, []);

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
