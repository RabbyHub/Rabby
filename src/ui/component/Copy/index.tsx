import { message } from 'antd';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconSuccess from 'ui/assets/success.svg';

interface CopyProps {
  className?: string;
  data: string;
  icon?: string;
  style?: React.CSSProperties;
}

const Copy = ({ data, className, style, icon }: CopyProps) => {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const clipboard = new ClipboardJS(ref.current!, {
      text: function () {
        return data;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Copied',
        duration: 0.5,
      });
    });
    return () => clipboard.destroy();
  }, [data]);

  return (
    <img
      ref={ref}
      src={icon || IconAddressCopy}
      id={'copyIcon'}
      className={clsx('js-copy cursor-pointer', className)}
      style={style}
    />
  );
};

export default Copy;
