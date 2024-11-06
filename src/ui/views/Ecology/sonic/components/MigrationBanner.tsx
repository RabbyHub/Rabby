import React from 'react';

import fantomLogoImg from '@/ui/assets/ecology/sonic/fantom-logo.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { SonicLogo } from './SonicLogo';

const arrowIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.66669 8H13.3334"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.33331 4L13.3333 8L9.33331 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const darkGradient =
  'linear-gradient(275deg, #102D3C 0.69%, #214E81 16.54%, #506179 36.39%, #ED5409 64.66%, #FFCB67 98.88%)';
const lightGradient =
  'linear-gradient(270deg, #102D3C 0%, #506179 23.22%, #FFA59D 49.5%, #FFCB67 69.5%, #214E81 98%)';

const darkBackground = 'rgba(20, 20, 22, 0.9)';
const lightBackground = 'rgba(245, 245, 245, 0.9)';

export const MigrationBanner = () => {
  const { isDarkTheme } = useThemeMode();

  return (
    <div
      style={{
        background: isDarkTheme ? darkGradient : lightGradient,
      }}
      className="p-[2px] rounded-[8px]"
    >
      <div
        style={{
          background: isDarkTheme ? darkBackground : lightBackground,
        }}
        className="h-[78px] w-full items-center justify-center rounded-[7px] backdrop-blur-sm"
      >
        <div className="flex flex-col gap-y-[7px] items-center justify-center h-full text-rabby-sonic-foreground">
          <div className="flex items-center gap-x-[8px]">
            <img className="h-[16px]" src={fantomLogoImg} alt="" />
            {arrowIcon}
            <SonicLogo className="h-[16px] fill-current" />
          </div>
          <div className="w-[280px] text-center uppercase text-[12px] font-semibold">
            Fantom is migrating to Sonic <br />
            <span className="text-[#1969FF]">$FTM</span> IS BECOMING{' '}
            <span className="text-[#FE9A4C]">$S</span>
          </div>
        </div>
      </div>
    </div>
  );
};
