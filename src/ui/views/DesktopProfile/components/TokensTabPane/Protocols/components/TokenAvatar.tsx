import cx from 'clsx';
import React, { useMemo } from 'react';
import iPlaceholder from 'ui/assets/token-default.svg';
import { cn } from '@/ui/utils/cn';

interface Props {
  className?: string;
  logo?: string;
  size?: number;
  logoClassName?: string;
}

export const TokenAvatar = (props: Props) => {
  const { className, logo, size = 32, logoClassName } = props;

  const logoStyle = useMemo(
    () => ({
      width: size,
      height: size,
    }),
    [size]
  );

  return (
    <div className={cx('relative', className)} style={logoStyle}>
      <div style={logoStyle}>
        <img
          className={cn(
            'w-full h-full rounded-[43px] overflow-hidden',
            logoClassName
          )}
          src={logo}
          loading="lazy"
          alt=""
          onError={(ev) => {
            (ev.target as HTMLImageElement).src = iPlaceholder;
          }}
        />
      </div>
    </div>
  );
};
