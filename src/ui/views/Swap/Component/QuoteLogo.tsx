import { ReactComponent as IconQuoteLoading } from '@/ui/assets/swap/quote-loading.svg';
import clsx from 'clsx';
import React from 'react';

export const QuoteLogo = ({
  isLoading,
  logo,
  isCex = false,
  loaded = false,
}: {
  isLoading?: boolean;
  logo: string;
  isCex?: boolean;
  loaded?: boolean;
}) => {
  return (
    <div className="flex items-center justify-center w-24 h-24">
      <div className="relative flex items-center justify-center">
        <img
          className={clsx(
            'rounded-full',
            !loaded && (isLoading || isCex)
              ? 'min-w-[18px] w-18 h-18'
              : 'min-w-[24px] w-24 h-24'
          )}
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
