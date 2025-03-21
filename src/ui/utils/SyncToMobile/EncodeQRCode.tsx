import QRCode from 'qrcode.react';
import React from 'react';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { ReactComponent as IconMaskIcon } from '@/ui/assets/create-mnemonics/mask-lock.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export const EncodeQRCode: React.FC<{
  input: string;
}> = ({ input }) => {
  const { t } = useTranslation();
  const [masked, setMasked] = React.useState(true);
  const urEncoder = React.useMemo(() => new UREncoder(UR.from(input), 150), [
    input,
  ]);
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
