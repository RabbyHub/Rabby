import QRCode from 'qrcode.react';
import React from 'react';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { ReactComponent as IconMaskIcon } from '@/ui/assets/create-mnemonics/mask-lock.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { gzipSync, strToU8 } from 'fflate';

export const EncodeQRCode: React.FC<{
  input: string;
  onClick?: () => void;
  visible?: boolean;
}> = ({ input, onClick, visible }) => {
  const { t } = useTranslation();
  const [masked, setMasked] = React.useState(true);

  React.useMemo(() => {
    const result = new UREncoder(UR.from(input), 200);

    console.log('origin size', result.fragmentsLength, result.messageLength);

    return result;
  }, [input]);

  const urEncoder = React.useMemo(() => {
    const result = new UREncoder(
      new UR(Buffer.from(gzipSync(strToU8(input))), 'bytes'),
      200
    );

    console.log('fflate  size', result.fragmentsLength, result.messageLength);

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

    window.addEventListener('visibilitychange', onBodyBlur, true);

    return () => {
      window.removeEventListener('visibilitychange', onBodyBlur, true);
    };
  }, []);

  const isHidden = !visible || masked;

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
          onClick?.();
        }}
      >
        <IconMaskIcon className="text-r-neutral-title2" />
        <p
          className={clsx(
            'mt-[12px] mb-0 mx-[60px]',
            'text-r-neutral-title2',
            'leading-[20px] text-[16px] font-medium',
            'text-center'
          )}
        >
          {t('page.syncToMobile.clickToShowQr')}
        </p>
      </div>
      <QRCode value={isHidden ? '' : data} size={310} />
    </div>
  );
};
