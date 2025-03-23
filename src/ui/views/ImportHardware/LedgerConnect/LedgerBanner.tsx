import React from 'react';
import { ReactComponent as LedgerBannerArrowSVG } from '@/ui/assets/ledger/button-arrow-cc.svg';
import clsx from 'clsx';

interface Props {
  className?: string;
}
export const LedgerBanner: React.FC<Props> = ({ className }) => {
  return (
    <div className={className}>
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

        <div
          className={clsx('space-y-10', 'flex flex-col items-center', '-ml-40')}
        >
          <span
            className={clsx('text-18 font-semibold', 'text-r-neutral-title-1')}
          >
            Don't have a Ledger yet?
          </span>

          <div className="flex gap-x-12">
            <a
              href="https://www.ledger.com/academy/hardwarewallet/why-you-should-choose-ledger-hardware-wallets"
              target="_blank"
              className={clsx(
                'border border-r-neutral-title1',
                'py-6 rounded-[6px] text-center',
                'text-r-neutral-title1 text-12 font-medium',
                'gap-4 flex items-center justify-center',
                'w-[136px]'
              )}
            >
              <span>Why Ledger?</span>
              <LedgerBannerArrowSVG className="text-r-neutral-title1" />
            </a>
            <a
              href="https://shop.ledger.com/?r=e801a108d26a"
              target="_blank"
              className={clsx(
                'bg-r-neutral-black py-6 px-18 rounded-[6px]',
                'text-r-neutral-title2 text-12 font-medium',
                'gap-4 flex items-center justify-center',
                'w-[136px]'
              )}
            >
              <span>Buy one now</span>
              <LedgerBannerArrowSVG className="text-r-neutral-title2" />
            </a>
          </div>
        </div>

        <img
          className="h-[100px]"
          src="/images/ledger-banner-2.png"
          alt="ledger"
        />
      </div>
    </div>
  );
};
