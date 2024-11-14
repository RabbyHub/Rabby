import airdropDarkImg from '@/ui/assets/ecology/sonic/airdrop-dark.svg';
import airdropLightImg from '@/ui/assets/ecology/sonic/airdrop-light.svg';
import arcadeDarkImg from '@/ui/assets/ecology/sonic/arcade-dark.svg';
import arcadeLightImg from '@/ui/assets/ecology/sonic/arcade-light.svg';
import arcadeMinesImg from '@/ui/assets/ecology/sonic/arcade-mines.png';
import arcadePlinkoImg from '@/ui/assets/ecology/sonic/arcade-plinko.png';
import arcadeWheelImg from '@/ui/assets/ecology/sonic/arcade-wheel.png';
import { ReactComponent as RcDiscord } from '@/ui/assets/ecology/sonic/discord.svg';
import { ReactComponent as RcGlobe } from '@/ui/assets/ecology/sonic/globe.svg';
import { ReactComponent as RcTelegram } from '@/ui/assets/ecology/sonic/telegram.svg';
import { ReactComponent as RcX } from '@/ui/assets/ecology/sonic/x.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { openInTab } from '@/ui/utils';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import { MigrationBanner } from '../../components/MigrationBanner';
import { SonicButton } from '../../components/SonicButton';
import { SonicCard } from '../../components/SonicCard';

const CardTitle = styled.h3`
  font-size: 32px;
  line-height: 32px;
  font-weight: bold;
  color: var(--r-sonic-foreground);
`;

const CardDesc = styled.div`
  font-size: 14px;
  line-height: 20px;
  font-weight: medium;
  color: var(--r-sonic-foreground);
`;

type HomeLink = {
  icon: React.ElementType;
  url: string;
};

const links: HomeLink[] = [
  {
    icon: RcGlobe,
    url: 'https://soniclabs.com',
  },
  {
    icon: RcX,
    url: 'https://x.com/0xSonicLabs',
  },
  {
    icon: RcTelegram,
    url: 'https://t.me/SonicAnnouncements',
  },
  {
    icon: RcDiscord,
    url: 'https://discord.gg/3Ynr2QDSnB',
  },
];

const HomeLink = ({ link, ...props }: { link: HomeLink }) => {
  const icon = React.createElement(link.icon, {
    className: 'w-[32px] h-[32px]',
  });

  return (
    <SonicCard
      onClick={() => openInTab(link.url)}
      className="p-[24px] justify-center items-center transition hover:scale-[1.02] cursor-pointer"
      {...props}
    >
      {icon}
    </SonicCard>
  );
};

export const SonicHome = () => {
  const history = useHistory();
  const { url } = useRouteMatch();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  return (
    <div className="p-[12px] flex flex-col gap-[10px] bg-rabby-sonic-background text-rabby-sonic-foreground min-h-full">
      <MigrationBanner />
      <SonicCard className="relative flex flex-col items-start justify-between h-[160px]">
        <div className="flex flex-col items-start gap-y-[4px] w-[141px]">
          <CardTitle>{t('page.ecology.sonic.home.airdrop')}</CardTitle>
          <CardDesc>{t('page.ecology.sonic.home.airdropDesc')}</CardDesc>
        </div>
        <SonicButton
          rounded
          onClick={() => {
            history.push(`${url}/points`);
          }}
          className="rounded-full"
        >
          {t('page.ecology.sonic.home.airdropBtn')}
        </SonicButton>
        <img
          src={isDarkTheme ? airdropDarkImg : airdropLightImg}
          alt=""
          className="absolute w-[60%] h-auto right-[-24px] top-1/2 -translate-y-1/2"
        />
      </SonicCard>

      <SonicCard className="flex flex-col items-start justify-between relative overflow-hidden h-[160px]">
        <div className="flex flex-col items-start gap-y-[4px]">
          <img
            src={isDarkTheme ? arcadeDarkImg : arcadeLightImg}
            alt=""
            className="h-[40px] w-auto"
          />
          <CardDesc className="max-w-[60%]">
            {t('page.ecology.sonic.home.arcadeDesc')}
          </CardDesc>
        </div>
        <SonicButton
          rounded
          className="rounded-full"
          onClick={() => openInTab('https://arcade.soniclabs.com')}
        >
          {t('page.ecology.sonic.home.arcadeBtn')}
        </SonicButton>
        <div className="absolute bottom-[16px] right-[16px] flex items-center gap-x-[8px]">
          <img
            className="shadow-md rounded-md transform rotate-[-8deg] translate-y-[4px]"
            width={48}
            height={48}
            src={arcadePlinkoImg}
            alt="Sonic Arcade Plinko Icon"
          />
          <img
            className="shadow-md rounded-md"
            width={48}
            height={48}
            src={arcadeMinesImg}
            alt="Sonic Arcade Mines Icon"
          />
          <img
            className="shadow-md rounded-md transform rotate-[8deg] translate-y-[4px]"
            width={48}
            height={48}
            src={arcadeWheelImg}
            alt="Sonic Arcade Wheel Icon"
          />
        </div>
      </SonicCard>
      <div className="grid grid-cols-2 gap-[10px]">
        <SonicCard className="flex flex-col items-start justify-between relative overflow-hidden h-[160px]">
          <div className="flex flex-col items-start gap-y-[4px]">
            <CardTitle>{t('page.ecology.sonic.home.migrateTitle')}</CardTitle>
            <CardDesc className="flex items-center gap-x-[4px] text-[16px] leading-[24px] font-semibold">
              <span className="text-[#1969FF]">$FTM</span>
              {t('page.ecology.sonic.home.migrateDesc')}
              <span className="text-[#FE9A4C]">$S</span>
            </CardDesc>
          </div>
          <SonicButton disabled rounded className="rounded-full">
            {t('page.ecology.sonic.home.migrateBtn')}
          </SonicButton>
        </SonicCard>
        <SonicCard className="flex flex-col items-start justify-between relative overflow-hidden h-[160px]">
          <div className="flex flex-col items-start gap-y-[4px]">
            <CardTitle>{t('page.ecology.sonic.home.earnTitle')}</CardTitle>
            <CardDesc>{t('page.ecology.sonic.home.earnDesc')}</CardDesc>
          </div>
          <SonicButton disabled rounded className="rounded-full">
            {t('page.ecology.sonic.home.earnBtn')}
          </SonicButton>
        </SonicCard>
      </div>
      <div className="flex flex-col items-center gap-y-[8px] pt-[16px] pb-[64px] text-rabby-sonic-foreground">
        <div className="text-[16px] leading-[20px] font-semibold mb-[8px]">
          {t('page.ecology.sonic.home.socialsTitle')}
        </div>
        <div className="flex items-center gap-x-[10px] text-rabby-sonic-foreground">
          {links.map((link) => (
            <HomeLink key={link.url} link={link} />
          ))}
        </div>
      </div>
    </div>
  );
};
