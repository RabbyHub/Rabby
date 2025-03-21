import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';
import React from 'react';
import { ReactComponent as IconQRCode } from '@/ui/assets/sync-to-mobile/qrcode.svg';

export interface Props {
  Icon: React.ReactNode;
  title: string;
  href: string;
}

export const DownloadCard: React.FC<Props> = ({ Icon, title, href }) => {
  const [isHover, setIsHover] = React.useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        'w-[160px] h-[80px] rounded-[8px]',
        'bg-r-neutral-card2',
        'relative',
        'overflow-hidden',
        'flex justify-center items-center'
      )}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {isHover ? (
        <div>
          <QRCodeSVG
            value={href}
            size={82}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
      ) : (
        <>
          <div className={clsx('absolute top-0 right-0')}>
            <IconQRCode className="absolute right-[8px] top-[8px] z-10" />

            <div
              className={clsx(
                'absolute right-0 top-0',
                'bg-r-blue-light2',
                'w-[41px] h-[122px]',
                'transform rotate-[-45deg] translate-x-[18%] translate-y-[-38%]'
              )}
            ></div>
          </div>
          <div className="flex items-center gap-x-[8px] flex-col justify-center">
            {Icon}
            <span className="text-r-neutral-title1 text-[14px] font-medium">
              {title}
            </span>
          </div>
        </>
      )}
    </a>
  );
};
