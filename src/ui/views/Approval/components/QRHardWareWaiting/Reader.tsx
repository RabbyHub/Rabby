import React, { useRef, useState } from 'react';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import * as uuid from 'uuid';
import { useTranslation } from 'react-i18next';
import QRCodeReader from 'ui/component/QRCodeReader';
import { URDecoder } from '@ngraveio/bc-ur';
import { openInternalPageInTab, useWallet } from 'ui/utils';
import { useHistory } from 'react-router-dom';
import { Form } from 'antd';
import Progress from '@/ui/component/Progress';

const Reader = ({ requestId, setErrorMessage, brandName, onScan }) => {
  const { t } = useTranslation();
  const decoder = useRef(new URDecoder());
  const wallet = useWallet();
  const history = useHistory();
  const [form] = Form.useForm();
  const [progress, setProgress] = useState(0);

  const handleSuccess = async (data) => {
    decoder.current.receivePart(data);
    setProgress(Math.floor(decoder.current.estimatedPercentComplete() * 100));
    if (decoder.current.isComplete()) {
      const ur = decoder.current.resultUR();
      if (ur.type === 'eth-signature') {
        const ethSignature = ETHSignature.fromCBOR(ur.cbor);
        const buffer = ethSignature.getRequestId();
        const signId = uuid.stringify(buffer as any);
        if (signId === requestId) {
          onScan(ur.cbor.toString('hex'));
          // return await wallet.submitQRHardwareSignature(
          //   signId,
          //   ur.cbor.toString('hex'),
          //   address
          // );
          return;
        }
        setErrorMessage(t('page.signFooterBar.qrcode.misMatchSignId'));
      } else {
        setErrorMessage(t('page.signFooterBar.qrcode.unknownQRCode'));
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
    <div>
      <div className="p-[10px] border border-gray-divider rounded-[8px] m-auto w-[222px] h-[222px]">
        <QRCodeReader
          width={200}
          height={200}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
      {progress > 0 ? (
        <div className="mt-[24px] m-auto w-[130px]">
          <Progress percent={progress} />
        </div>
      ) : (
        <p className="text-13 leading-[18px] mb-0 mt-24 text-r-neutral-body font-medium text-center">
          {t('page.signFooterBar.qrcode.afterSignDesc', { brand: brandName })}
        </p>
      )}
    </div>
  );
};

export default Reader;
