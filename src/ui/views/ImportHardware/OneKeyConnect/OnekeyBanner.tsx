import React from 'react';
import clsx from 'clsx';
import { t } from 'i18next';

interface Props {
  className?: string;
}
export const OneKeyBanner: React.FC<Props> = ({ className }) => {
  return (
    <div className={className}>
      <div
        className={clsx(
          'bg-r-neutral-card-2 rounded-[12px]',
          'onekey-banner-content',
          'flex items-center justify-between'
        )}
      >
        <img
          className="h-[100px]"
          src="/images/onekey-banner-1.png"
          alt="onekey"
        />

        <div className={clsx('space-y-10', 'flex flex-col items-center')}>
          <span
            className={clsx('text-20 font-semibold', 'text-r-neutral-title-1')}
          >
            {t('page.newAddress.onekey.haveOneKey')}
          </span>

          <div className="flex gap-x-12">
            <a
              href="https://onekey.so/why/"
              target="_blank"
              className={clsx(
                'border border-r-neutral-title1',
                'py-6 rounded-[12px] text-center',
                'text-r-neutral-title1 text-14 font-medium',
                'gap-4 flex items-center justify-center',
                'w-[148px] h-[40px]'
              )}
            >
              <span>{t('page.newAddress.onekey.whyOneKey')}</span>
            </a>
            <a
              href="https://onekey.so/r/1L7FNM"
              target="_blank"
              className={clsx(
                'py-6 rounded-[12px] text-center',
                'text-r-neutral-title2 text-14 font-medium',
                'gap-4 flex items-center justify-center',
                'w-[148px] h-[40px] onekey-buy-button'
              )}
            >
              <span>{t('page.newAddress.onekey.buyOneKey')}</span>
            </a>
          </div>
        </div>

        <img
          className="h-[100px]"
          src="/images/onekey-banner-2.png"
          alt="onekey"
        />
      </div>
    </div>
  );
};
