import React, { useRef, useState } from 'react';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import * as uuid from 'uuid';
import { useTranslation } from 'react-i18next';
import QRCodeReader from 'ui/component/QRCodeReader';
import { URDecoder } from '@ngraveio/bc-ur';
import { openInternalPageInTab, useWallet } from 'ui/utils';
import { useHistory } from 'react-router-dom';
import { Form } from 'antd';

const Reader = () => {
  const { t } = useTranslation();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const wallet = useWallet();
  const history = useHistory();
  const [form] = Form.useForm();

  const handleSuccess = async (data) => {
    try {
      decoder.current.receivePart(data);
      if (decoder.current.isComplete()) {
        const ur = decoder.current.resultUR();
        if (ur.type === 'eth-signature') {
          try {
            const ethSignature = ETHSignature.fromCBOR(ur.cbor);
            const buffer = ethSignature.getRequestId();
            console.log(ur.cbor, 'reader', ethSignature);
            const signId = uuid.stringify(buffer);
          } catch (e) {
            console.log(`ethSignature error ${e}`);
          }
          const ethSignature = ETHSignature.fromCBOR(ur.cbor);
          const buffer = ethSignature.getRequestId();
          const signId = uuid.stringify(buffer);
          // await wallet.submitQRHardwareSignature(
          //   signId,
          //   ur.cbor.toString('hex')
          // );
          console.log(
            `QRHardwareSign Tx handle success ${ur.cbor.toString('hex')}`
          );
          setErrorMessage(t('QRHardwareInvalidTransactionTitle'));
        } else {
          setErrorMessage(t('QRHardwareInvalidTransactionTitle'));
          throw new Error(t('unknownQrCode'));
        }
      }
    } catch (e) {
      setErrorMessage(t('unknownQrCode'));
    }
  };

  const handleError = async () => {
    await wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };

  return (
    <QRCodeReader
      width={250}
      height={250}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};

export default Reader;
