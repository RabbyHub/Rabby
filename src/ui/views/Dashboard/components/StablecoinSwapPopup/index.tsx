import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReactComponent as RcArrowRight } from '@/ui/assets/dashboard/stablecoin-swap-popup/arrow-right.svg';
import BackgroundEffect from '@/ui/assets/dashboard/stablecoin-swap-popup/background-effect.svg';
import { ReactComponent as RcClose } from '@/ui/assets/dashboard/stablecoin-swap-popup/close.svg';
import { ReactComponent as RcMoreDot } from '@/ui/assets/dashboard/stablecoin-swap-popup/more-dot.svg';
import { useStablecoinSwapPopup } from '../../hooks/ads/useStablecoinSwapPopup';

/** Bottom promotion displayed over the popup Dashboard. */
export const StablecoinSwapPopup: React.FC = () => {
  const { t } = useTranslation();
  const {
    visible,
    onClose,
    onSwap,
    payTokenIcon,
    supportedStablecoinIcons,
    rotatingToken,
    previousRotatingToken,
    onTokenAnimationEnd,
  } = useStablecoinSwapPopup();

  if (!visible) {
    return null;
  }

  return (
    <section
      role="dialog"
      aria-label={t('page.dashboard.home.stablecoinSwapPopup.title')}
      className="group absolute bottom-[-126px] left-0 z-20 h-[190px] w-full overflow-hidden rounded-t-[16px] border border-r-neutral-line bg-r-neutral-bg1 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] transition-[bottom] duration-300 ease-out hover:bottom-0"
    >
      <div className="pointer-events-none absolute left-[-92px] top-[106px] h-[211px] w-[186px]">
        <img
          src={BackgroundEffect}
          alt=""
          className="absolute left-[-500px] top-[-500px] h-[1211px] w-[1186px] max-w-none"
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={t('page.dashboard.home.stablecoinSwapPopup.close')}
        className="absolute right-[12px] top-[10px] flex h-[24px] w-[24px] items-center justify-center"
      >
        <RcClose className="h-[14px] w-[14px] text-[#C5C5CF]" />
      </button>

      <div className="absolute left-1/2 top-[22px] flex -translate-x-1/2 items-center gap-[12px] whitespace-nowrap text-[16px] leading-[20px] text-r-neutral-title1">
        <span>{t('page.dashboard.home.stablecoinSwapPopup.title')}</span>
        <img src={payTokenIcon} alt="USDC" className="h-[20px] w-[20px]" />
        <span aria-hidden="true">=&gt;</span>
        <div
          role="img"
          aria-label={rotatingToken.symbol}
          className="relative block h-[20px] w-[20px] flex-none overflow-hidden"
        >
          {previousRotatingToken && (
            <img
              src={previousRotatingToken.src}
              alt=""
              className="stablecoin-swap-popup-token-exit absolute left-0 top-0 block h-[20px] w-[20px] max-w-none"
            />
          )}
          <img
            src={rotatingToken.src}
            alt=""
            onAnimationEnd={onTokenAnimationEnd}
            className={`block h-[20px] w-[20px] max-w-none ${
              previousRotatingToken ? 'stablecoin-swap-popup-token-enter' : ''
            }`}
          />
        </div>
      </div>

      <div className="absolute left-1/2 top-[52px] flex -translate-x-1/2 flex-col items-center gap-[8px] transition-[top] duration-300 ease-out group-hover:top-[59px]">
        <div className="flex h-[20px] items-end gap-[8px]">
          {supportedStablecoinIcons.map((icon) => (
            <img
              key={icon}
              src={icon}
              alt=""
              className="h-[20px] w-[20px] opacity-60"
            />
          ))}
          <span
            aria-hidden="true"
            className="flex h-[20px] items-center gap-[2px]"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <RcMoreDot
                key={index}
                className="h-[3px] w-[3px] text-r-neutral-foot"
              />
            ))}
          </span>
        </div>

        <p className="whitespace-nowrap text-[12px] leading-[14px] text-r-neutral-title1 opacity-80">
          {t('page.dashboard.home.stablecoinSwapPopup.supportPrefix')}{' '}
          <strong className="font-bold">
            {t('page.dashboard.home.stablecoinSwapPopup.supportCount')}
          </strong>{' '}
          {t('page.dashboard.home.stablecoinSwapPopup.supportSuffix')}
        </p>
      </div>

      <button
        type="button"
        onClick={onSwap}
        className="absolute left-1/2 top-[121px] flex h-[36px] w-[240px] -translate-x-1/2 cursor-pointer items-center justify-center gap-[6px] rounded-[8px] border border-r-neutral-line bg-transparent text-[14px] leading-[18px] text-r-neutral-title1 hover:border-r-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default active:border-r-blue-default active:bg-r-blue-light2 active:text-r-blue-default"
      >
        <span>{t('page.dashboard.home.stablecoinSwapPopup.goToSwap')}</span>
        <RcArrowRight className="h-[14px] w-[14px]" />
      </button>
    </section>
  );
};
