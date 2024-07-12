import { ReactComponent as IconQuoteLoading } from '@/ui/assets/swap/quote-loading.svg';
import clsx from 'clsx';
import React from 'react';

export const QuoteLogo = ({
  isLoading,
  bridgeLogo,
  logo,
}: {
  isLoading?: boolean;
  logo: string;
  bridgeLogo?: string;
}) => {
  return (
    <div className="flex items-center justify-center w-24 h-24 relative">
      <div className="relative flex items-center justify-center">
        <img
          className={clsx('rounded-full', 'min-w-[24px] w-24 h-24')}
          src={logo}
        />
        {!!bridgeLogo && (
          <img
            className="absolute w-14 h-14 -right-2 -bottom-2 rounded-full"
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
