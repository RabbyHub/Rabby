import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode.react';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { Button } from 'antd';
import clsx from 'clsx';

const Player = ({ type, cbor, onSign, brandName }) => {
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
    <div className="flex flex-col items-center">
      <div className="p-[5px] border border-gray-divider rounded-[8px]">
        <QRCode value={currentQRCode.toUpperCase()} size={150} />
      </div>
      <p className="text-13 leading-[18px] mb-0 mt-20 text-gray-subTitle font-medium text-center whitespace-nowrap">
        Scan with your {brandName} to sign<br></br>After signing, click the
        button below to receive the signature
      </p>

      <Button
        onClick={onSign}
        className={clsx(
          'w-[180px] h-[40px] mt-16',
          'active:before:bg-[#00000033]'
        )}
        type="primary"
      >
        Get signature
      </Button>
    </div>
  );
};
export default Player;
