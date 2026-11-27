import { message } from 'antd';
import clsx from 'clsx';
import React, { MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import IconAddressCopyLight from 'ui/assets/icon-copy-2-light.svg';
import IconAddressCopyDark from 'ui/assets/icon-copy-2-dark.svg';
import IconSuccess from 'ui/assets/success.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { copyAddress, copyTextToClipboard } from '@/ui/utils/clipboard';

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
  const { t } = useTranslation();

  const handleClick: MouseEventHandler = (event) => {
    if (variant === 'address') {
      copyAddress(data);
    } else {
      copyTextToClipboard(data).then((copied) => {
        if (!copied) {
          return;
        }
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: t('global.copied'),
          duration: 0.5,
        });
      });
    }
    onClick?.(event);
  };

  const { isDarkTheme } = useThemeMode();

  const DEFAULT_COPY_ICON = isDarkTheme
    ? IconAddressCopyDark
    : IconAddressCopyLight;

  return (
    <img
      onClick={handleClick}
      src={icon || DEFAULT_COPY_ICON}
      id={'copyIcon'}
      className={clsx('js-copy cursor-pointer', className)}
      style={style}
    />
  );
};

export default Copy;
