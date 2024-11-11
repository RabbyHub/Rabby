import { message } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconSuccess from 'ui/assets/success.svg';

interface CopyOptions {
  variant?: 'address';
  duration?: number;
  successText?: string;
}

export const useCopy = () => {
  const [hasCopied, setHasCopied] = useState(false);
  const { t } = useTranslation();

  const copyToClipboard = async (text: string, options: CopyOptions = {}) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);

      if (options.variant === 'address') {
        const destroy = message.success({
          duration: options.duration || 1,
          icon: <i />,
          content: (
            <div>
              <div className="flex gap-4 mb-4">
                <img src={IconSuccess} alt="" />
                {options.successText || t('global.copied')}
              </div>
              <div className="text-white">{text}</div>
            </div>
          ),
        });
        setTimeout(() => {
          destroy();
          setHasCopied(false);
        }, (options.duration || 1) * 1000);
      } else {
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: options.successText || t('global.copied'),
          duration: options.duration || 0.5,
        });
        setTimeout(() => {
          setHasCopied(false);
        }, (options.duration || 0.5) * 1000);
      }

      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      return false;
    }
  };

  return { copyToClipboard, hasCopied };
};
