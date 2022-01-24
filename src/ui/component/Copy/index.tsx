import { message } from 'antd';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import React from 'react';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconSuccess from 'ui/assets/success.svg';

interface CopyProps {
  className?: string;
  data: string;
  style?: React.CSSProperties;
}

const Copy = ({ data, className, style }: CopyProps) => {
  const handleCopy = () => {
    const clipboard = new ClipboardJS('.js-copy', {
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
      clipboard.destroy();
    });
  };

  return (
    <img
      onClick={handleCopy}
      src={IconAddressCopy}
      id={'copyIcon'}
      className={clsx('js-copy cursor-pointer', className)}
      style={style}
    />
  );
};

export default Copy;
