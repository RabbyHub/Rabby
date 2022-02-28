import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { composeInitialProps, useTranslation } from 'react-i18next';
import { URDecoder } from '@ngraveio/bc-ur';
import QRCodeReader from 'ui/component/QRCodeReader';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import './style.less';

import KeystoneLogo from 'ui/assets/walletlogo/keystone.png';

const ImportQRCodeBase = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const decoder = useRef(new URDecoder());

  const handleScanQRCodeSuccess = (data) => {
    decoder.current.receivePart(data);
    if (decoder.current.isComplete()) {
      const result = decoder.current.resultUR();
      result.cbor.toString('hex');
      /* TODO:
        const stashKeyringId = await wallet.submitQRHardwareCryptoHDKey();
        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: HARDWARE_KEYRING_TYPES.KeyStone.type,
            path: currentPath,
            keyringId
          },
        });
      */
    }
  };

  const handleScanQRCodeError = async () => {
    await wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  useEffect(() => {
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <StrayPageWithButton
      form={form}
      hasBack
      hasDivider
      noPadding
      className="import-qrcode"
      onBackClick={handleClickBack}
    >
      <header className="create-new-header create-password-header h-[264px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <img
          className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
          src={KeystoneLogo}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Keystone')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('Scan the QR code on the Keystone hardware wallet')}
        </p>
        <img src="/images/watch-mask.png" className="mask" />
      </header>
      <div className="flex justify-center qrcode-scanner">
        <QRCodeReader
          width={176}
          height={176}
          onSuccess={handleScanQRCodeSuccess}
          onError={handleScanQRCodeError}
        />
      </div>
    </StrayPageWithButton>
  );
};

export default ImportQRCodeBase;
