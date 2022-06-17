import React, { useRef } from 'react';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import * as uuid from 'uuid';
import { useTranslation } from 'react-i18next';
import QRCodeReader from 'ui/component/QRCodeReader';
import { URDecoder } from '@ngraveio/bc-ur';
import { openInternalPageInTab, useWallet } from 'ui/utils';
import { useHistory } from 'react-router-dom';
import { Form } from 'antd';

const Reader = ({ requestId, setErrorMessage, address }) => {
  const { t } = useTranslation();
  const decoder = useRef(new URDecoder());
  const wallet = useWallet();
  const history = useHistory();
  const [form] = Form.useForm();

  const handleSuccess = async (data) => {
    decoder.current.receivePart(data);
    if (decoder.current.isComplete()) {
      const ur = decoder.current.resultUR();
      if (ur.type === 'eth-signature') {
        const ethSignature = ETHSignature.fromCBOR(ur.cbor);
        const buffer = ethSignature.getRequestId();
        const signId = uuid.stringify(buffer);
        if (signId === requestId) {
          return await wallet.submitQRHardwareSignature(
            signId,
            ur.cbor.toString('hex'),
            address
          );
        }
        setErrorMessage(t('KesytoneMismatchedSignId'));
      } else {
        setErrorMessage(t('unknownQrCode'));
      }
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
