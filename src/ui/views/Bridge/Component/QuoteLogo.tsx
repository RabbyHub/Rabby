import { ReactComponent as IconQuoteLoading } from '@/ui/assets/swap/quote-loading.svg';
import clsx from 'clsx';
import React from 'react';

export const QuoteLogo = ({
  isLoading,
  bridgeLogo,
  logo,
  size = 24,
  bridgeLogoSize = 14,
}: {
  isLoading?: boolean;
  logo: string;
  bridgeLogo?: string;
  size?: number;
  bridgeLogoSize?: number;
}) => {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="relative flex items-center justify-center">
        <img
          className="rounded-full"
          style={{ minWidth: size, width: size, height: size }}
          src={logo}
        />
        {!!bridgeLogo && (
          <img
            className="absolute -bottom-2 -right-2 rounded-full"
            style={{ width: bridgeLogoSize, height: bridgeLogoSize }}
            src={bridgeLogo}
          />
        )}
        {isLoading && (
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <IconQuoteLoading
              className={clsx('animate-spin w-24 h-24', 'w-32 h-32')}
              viewBox="0 0 40 40"
            />
          </div>
        )}
      </div>
    </div>
  );
};
