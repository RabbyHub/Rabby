import pointsLightImg from '@/ui/assets/ecology/sonic/points-bg-light.png';
import pointsDarkImg from '@/ui/assets/ecology/sonic/points-bg.png';
import { Copy } from '@/ui/component';
import { useThemeMode } from '@/ui/hooks/usePreference';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SonicButton } from '../../components/SonicButton';
import { SonicCard } from '../../components/SonicCard';
import { useSonicPoints } from './hooks';

const links = [
  {
    title: 'page.ecology.sonic.points.sonicArcade',
    cta: {
      text: 'page.ecology.sonic.points.sonicArcadeBtn',
      onClick: () => {
        window.open('https://arcade.soniclabs.com', '_blank');
      },
    },
  },
  {
    title: 'page.ecology.sonic.points.pointsDashboard',
    cta: {
      text: 'page.ecology.sonic.points.pointsDashboardBtn',
      onClick: () => {
        window.open('https://airdrop.soniclabs.com', '_blank');
      },
    },
  },
];

const SonicPointsLink = ({
  title,
  cta,
}: {
  title: string;
  cta: { text: string; onClick: () => void };
}) => {
  return (
    <SonicCard className="flex items-center justify-between w-full gap-[8px] p-[12px] rounded-[8px] bg-rabby-sonic-card text-rabby-sonic-card-foreground">
      <div className="text-[14px] font-bold">{title}</div>
      <SonicButton onClick={cta.onClick}>{cta.text}</SonicButton>
    </SonicCard>
  );
};

const SonicPoints = () => {
  const {
    totalPoints,
    referralPoints,
    pointsLoading,
    referralCode,
  } = useSonicPoints();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  return (
    <div className="h-[100vh] min-h-[100vh] flex flex-col bg-r-sonic-background text-r-sonic-foreground">
      <div
        style={{
          backgroundImage: `url(${
            isDarkTheme ? pointsDarkImg : pointsLightImg
          })`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className="flex flex-col items-center space-y-[8px] pt-[20px] pb-[40px]"
      >
        <div className="text-[20px] font-bold text-r-sonic-foreground">
          {t('page.ecology.sonic.points.sonicPoints')}
        </div>
        <div className="text-[48px] font-bold text-r-sonic-foreground h-[58px] flex items-center">
          {pointsLoading
            ? '-'
            : totalPoints.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
        </div>
        <div className="text-[14px] text-r-sonic-foreground h-[20px] flex items-center">
          {t('page.ecology.sonic.points.today')}:{' '}
          {pointsLoading
            ? '-'
            : referralPoints.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
        </div>
      </div>
      <div className="rounded-t-[20px] bg-rabby-sonic-background p-[20px] mt-[-20px] flex flex-col gap-[16px]">
        <div className="flex flex-col items-start gap-[8px]">
          <div className="text-[14px] text-r-sonic-foreground font-bold">
            {t('page.ecology.sonic.points.referralCode')}:
          </div>
          {pointsLoading ? (
            <div className="flex items-center justify-evenly w-full gap-[8px]">
              <div className="bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] flex w-full items-center justify-center gap-[10px] font-bold">
                -
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-evenly w-full gap-[8px]">
              <div className="bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] flex w-full items-center justify-center gap-[10px] font-bold">
                <div>{referralCode}</div>
                <Copy data={referralCode} />
              </div>
              <button
                className="flex w-full items-center bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] justify-center gap-[10px] font-bold"
                onClick={() => {
                  window.open(
                    `https://x.com/intent/tweet?text=${encodeURIComponent(
                      `Join Sonic and get ${referralPoints} points! Use my code: ${referralCode}`
                    )}&url=https://sonic.rabby.io`,
                    '_blank'
                  );
                }}
              >
                {t('page.ecology.sonic.points.shareOn')}
                <svg
                  className="w-[16px] h-[16px]"
                  viewBox="0 0 300 300.251"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="currentColor"
                    d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-[8px]">
          {links.map((link) => (
            <SonicPointsLink
              title={t(link.title)}
              cta={{
                text: t(link.cta.text),
                onClick: link.cta.onClick,
              }}
              key={link.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export { SonicPoints };
