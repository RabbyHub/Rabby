import React, { useEffect, useState } from 'react';
import Player from './Player';
import Reader from './Reader';
import { useWallet } from 'ui/utils';
import { Tx } from 'background/service/openapi';
import { WALLET_BRAND_CONTENT, WALLET_BRAND_TYPES } from 'consts';
import { useTranslation } from 'react-i18next';
import { Form } from 'antd';
import { StrayPageWithButton } from 'ui/component';
import { useHistory } from 'react-router-dom';

const QRHardwareSignTx = ({ params }: { params: Tx }) => {
  const wallet = useWallet();
  const [form] = Form.useForm();
  const [status, setStatus] = useState('play');
  const [ur, setUr] = useState(null);
  const history = useHistory();
  const { t } = useTranslation();

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    const urResponse = await wallet.getQRHardwareSignRequestUR(
      account.address,
      params
    );
    if (urResponse) {
      setUr(urResponse.payload);
    }
  };

  useEffect(() => {
    init();
  }, ['ur']);

  const handleCancel = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };
  const handleRequestSignature = () => {
    setStatus('read');
  };
  const walletBrandContent = WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE];
  return (
    <StrayPageWithButton
      form={form}
      hasBack
      hasDivider
      noPadding
      className="qr-hardware-sign"
      onBackClick={handleCancel}
      NextButtonContent={t('Get Signature')}
      onNextClick={handleRequestSignature}
    >
      <header className="create-new-header create-password-header h-[264px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <img
          className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
          src={walletBrandContent.image}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t(walletBrandContent.name)}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('Scan the QR code on the Keystone hardware wallet')}
        </p>
        <img src="/images/watch-mask.png" className="mask" />
      </header>
      <div className="flex justify-center qrcode-scanner">
        {status === 'play' && ur && <Player type={ur.type} cbor={ur.cbor} />}
        {status === 'read' && <Reader />}
      </div>
    </StrayPageWithButton>
  );
};

export default QRHardwareSignTx;
