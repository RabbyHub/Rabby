import React from 'react';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { ReactComponent as LedgerBannerArrowSVG } from '@/ui/assets/ledger/button-arrow.svg';
import clsx from 'clsx';

interface Props {
  className?: string;
}
export const LedgerBanner: React.FC<Props> = ({ className }) => {
  const { isDarkTheme } = useThemeMode();

  return (
    <a
      className={className}
      href="https://shop.ledger.com/?r=e801a108d26a"
      target="_blank"
    >
      <div
        className={clsx(
          'bg-r-neutral-card-2 rounded-[12px]',
          'w-[800px] h-[100px] px-[50px]',
          'flex items-center justify-between'
        )}
      >
        <img
          className="h-[100px]"
          src="/images/ledger-banner-1.png"
          alt="ledger"
        />

        <div className={clsx('space-y-10', 'flex flex-col items-center')}>
          <span
            className={clsx(
              'text-18 font-semibold',
              isDarkTheme ? 'text-r-neutral-title-2' : 'text-r-neutral-black'
            )}
          >
            Don't have a Ledger yet?
          </span>
          <div
            className={clsx(
              'bg-r-neutral-black py-6 px-18 rounded-[6px]',
              'text-r-neutral-title2 text-12 font-medium',
              'gap-4 flex items-center justify-center',
              'w-[136px]'
            )}
          >
            <span>Buy one now</span>
            <LedgerBannerArrowSVG />
          </div>
        </div>

        <img
          className="h-[100px]"
          src="/images/ledger-banner-2.png"
          alt="ledger"
        />
      </div>
    </a>
  );
};
