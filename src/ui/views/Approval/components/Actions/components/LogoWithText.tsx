import { useRabbyDispatch } from '@/ui/store';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import React, { ReactNode } from 'react';
import IconUnknown from 'ui/assets/token-default.svg';
import { cn } from '@/ui/utils/cn';
import styles from './LogoWithText.module.css';

const LogoWithText = ({
  logo,
  text = '',
  icon,
  logoRadius = '',
  logoSize = 16,
  textStyle = {},
  className,
  id,
}: {
  logo?: string;
  text: string | ReactNode;
  icon?: ReactNode;
  logoRadius?: string;
  logoSize?: number;
  textStyle?: React.CSSProperties;
  className?: string;
  hoverToken?: TokenItem;
  id?: string;
}) => {
  const dispatch = useRabbyDispatch();

  return (
    <div className={cn(styles.wrapper, className)} id={id}>
      <img
        src={logo || IconUnknown}
        className="logo"
        style={{
          borderRadius: logoRadius,
          width: `${logoSize}px`,
          height: `${logoSize}px`,
        }}
      />
      <div className="text" style={textStyle}>
        {text}
      </div>
      {icon || null}
    </div>
  );
};

export default LogoWithText;
