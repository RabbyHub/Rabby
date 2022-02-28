import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode.react';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { useTranslation } from 'react-i18next';

const Player = ({ type, cbor }) => {
  const { t } = useTranslation();
  const urEncoder = useMemo(
    () => new UREncoder(new UR(Buffer.from(cbor, 'hex'), type), 400),
    [cbor, type]
  );
  const [currentQRCode, setCurrentQRCode] = useState(urEncoder.nextPart());
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentQRCode(urEncoder.nextPart());
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [urEncoder]);

  return (
    <div className="flex flex-col ant-list-item">
      <QRCode value={currentQRCode.toUpperCase()} size={250} />
      <p className="text-14 mb-0 mt-20 text-center">
        {t('KeystoneSignRequestDescription')}
      </p>
    </div>
  );
};
export default Player;
