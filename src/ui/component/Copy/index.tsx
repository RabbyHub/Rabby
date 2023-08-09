import { message } from 'antd';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import React, { MouseEventHandler, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import IconAddressCopy from 'ui/assets/icon-copy-2.svg';
import IconSuccess from 'ui/assets/success.svg';

interface CopyProps {
  className?: string;
  data: string;
  icon?: string;
  style?: React.CSSProperties;
  variant?: 'address';
  onClick?: MouseEventHandler;
}

const Copy = ({
  data,
  className,
  style,
  icon,
  variant,
  onClick,
}: CopyProps) => {
  const ref = useRef<HTMLImageElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const clipboard = new ClipboardJS(ref.current!, {
      text: function () {
        return data;
      },
    });

    clipboard.on('success', () => {
      if (variant === 'address') {
        message.success({
          duration: 1,
          icon: <i />,
          content: (
            <div>
              <div className="flex gap-4 mb-4">
                <img src={IconSuccess} alt="" />
                {t('global.copied')}
              </div>
              <div className="text-white">{data}</div>
            </div>
          ),
        });
      } else {
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: t('global.copied'),
          duration: 0.5,
        });
      }
    });
    return () => clipboard.destroy();
  }, [data]);

  return (
    <img
      ref={ref}
      onClick={onClick}
      src={icon || IconAddressCopy}
      id={'copyIcon'}
      className={clsx('js-copy cursor-pointer', className)}
      style={style}
    />
  );
};

export default Copy;
