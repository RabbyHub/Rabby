import QRCode from 'qrcode.react';
import React from 'react';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { ReactComponent as IconMaskIcon } from '@/ui/assets/create-mnemonics/mask-lock.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { gzipSync, strToU8 } from 'fflate';
import LZString from 'lz-string';

export const EncodeQRCode: React.FC<{
  input: string;
}> = ({ input }) => {
  const { t } = useTranslation();
  const [masked, setMasked] = React.useState(true);

  React.useMemo(() => {
    const result = new UREncoder(UR.from(input), 150);

    console.log(
      'origin size',
      result.fragments,
      result.fragmentsLength,
      result.messageLength
    );

    return result;
  }, [input]);

  const urEncoder = React.useMemo(() => {
    const result = new UREncoder(
      new UR(Buffer.from(gzipSync(strToU8(input))), 'bytes'),
      150
    );

    console.log(
      'fflate  size',
      result.fragments,
      result.fragmentsLength,
      result.messageLength
    );

    return result;
  }, [input]);

  React.useMemo(() => {
    const result = new UREncoder(UR.from(LZString.compressToUTF16(input)), 150);

    console.log(
      'LZString compressToUTF16 size',
      result.fragments,
      result.fragmentsLength,
      result.messageLength
    );

    return result;
  }, [input]);

  React.useMemo(() => {
    const result = new UREncoder(
      new UR(Buffer.from(LZString.compressToUTF16(input)), 'bytes'),
      150
    );

    console.log(
      'LZString Buffer.from(LZString.compressToUTF16 size',
      result.fragments,
      result.fragmentsLength,
      result.messageLength
    );

    return result;
  }, [input]);

  React.useMemo(() => {
    const result = new UREncoder(
      new UR(Buffer.from(LZString.compressToUint8Array(input)), 'bytes'),
      150
    );

    console.log(
      'LZString compressToUint8Array size',
      result.fragments,
      result.fragmentsLength,
      result.messageLength
    );

    return result;
  }, [input]);

  const [data, setData] = React.useState(urEncoder.nextPart());

  React.useEffect(() => {
    const id = setInterval(() => {
      setData(urEncoder.nextPart());
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [urEncoder]);

  React.useEffect(() => {
    const onBodyBlur = async () => {
      setMasked(true);
    };

    window.addEventListener('blur', onBodyBlur, true);

    return () => {
      window.removeEventListener('blur', onBodyBlur, true);
    };
  }, []);

  const isHidden = masked;

  if (!data) {
    return null;
  }

  return (
    <div
      className={clsx(
        'relative w-[320px] h-[320px]',
        'flex items-center justify-center'
      )}
    >
      <div
        className={clsx(
          'bg-[#000000] bg-opacity-80',
          'rounded-[7px]',
          'absolute inset-0 z-10',
          'flex flex-col items-center justify-center',
          'cursor-pointer',
          'backdrop-blur-md',
          isHidden ? 'block' : 'hidden'
        )}
        onClick={() => {
          setMasked(false);
        }}
      >
        <IconMaskIcon className="text-r-neutral-title2" />
        <p
          className={clsx(
            'mt-[12px] mb-0 text-r-neutral-title2',
            'leading-[20px] text-[16px] font-medium'
          )}
        >
          {t('page.syncToMobile.clickToShowQr')}
        </p>
      </div>
      <QRCode value={isHidden ? '' : data} size={300} />
    </div>
  );
};
