import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode.react';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from 'antd';
import clsx from 'clsx';

const Player = ({ type, cbor, onSign, brandName }) => {
  const urEncoder = useMemo(
    () => new UREncoder(new UR(Buffer.from(cbor, 'hex'), type), 400),
    [cbor, type]
  );
  const [currentQRCode, setCurrentQRCode] = useState(urEncoder.nextPart());
  const { t } = useTranslation();
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentQRCode(urEncoder.nextPart());
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [urEncoder]);

  return (
    <div className="flex flex-col items-center">
      <div className="p-[5px] border border-gray-divider rounded-[8px] bg-white">
        <QRCode value={currentQRCode.toUpperCase()} size={180} />
      </div>
      <p className="text-13 leading-[18px] mb-0 mt-6 text-gray-subTitle font-medium text-center whitespace-nowrap">
        <Trans
          i18nKey="page.signFooterBar.qrcode.qrcodeDesc"
          values={{
            brand: brandName,
          }}
        ></Trans>
      </p>

      <Button
        onClick={onSign}
        className={clsx(
          'w-[180px] h-[40px] mt-6',
          'active:before:bg-[#00000033]'
        )}
        type="primary"
      >
        {t('page.signFooterBar.qrcode.getSig')}
      </Button>
    </div>
  );
};
export default Player;
