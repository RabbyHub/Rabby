import { ReactComponent as IconQuoteLoading } from '@/ui/assets/swap/quote-loading.svg';
import clsx from 'clsx';
import React from 'react';

export const QuoteLogo = ({
  isLoading,
  logo,
  isCex = false,
  loaded = false,
  size,
}: {
  isLoading?: boolean;
  logo: string;
  isCex?: boolean;
  loaded?: boolean;
  size?: number;
}) => {
  const imageSize = size ?? (!loaded && (isLoading || isCex) ? 18 : 24);
  const wrapperSize = size ?? 24;

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: wrapperSize, height: wrapperSize }}
    >
      <div className="relative flex items-center justify-center">
        <img
          className="rounded-full"
          style={{
            minWidth: imageSize,
            width: imageSize,
            height: imageSize,
          }}
          src={logo}
        />
        {isLoading && (
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <IconQuoteLoading
              className={clsx(
                'animate-spin w-24 h-24',
                loaded ? 'w-32 h-32' : 'w-24 h-24'
              )}
              viewBox="0 0 40 40"
            />
          </div>
        )}
      </div>
    </div>
  );
};
