import pointsLightImg from '@/ui/assets/ecology/sonic/points-bg-light.png';
import pointsDarkImg from '@/ui/assets/ecology/sonic/points-bg.png';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { openInTab } from '@/ui/utils';
import { ellipsis } from '@/ui/utils/address';
import { copyAddress } from '@/ui/utils/clipboard';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CodeAndShare } from '../../components/CodeAndShare';
import { SonicButton } from '../../components/SonicButton';
import { SonicCard } from '../../components/SonicCard';
import { useSonicData } from './hooks';

const links = [
  {
    title: 'page.ecology.sonic.points.sonicArcade',
    cta: {
      text: 'page.ecology.sonic.points.sonicArcadeBtn',
      onClick: () => openInTab('https://arcade.soniclabs.com'),
    },
  },
  {
    title: 'page.ecology.sonic.points.pointsDashboard',
    cta: {
      text: 'page.ecology.sonic.points.pointsDashboardBtn',
      onClick: () => openInTab('https://airdrop.soniclabs.com'),
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
      <SonicButton rounded onClick={cta.onClick}>
        {cta.text}
      </SonicButton>
    </SonicCard>
  );
};

const ErrorOverlay = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm bg-rabby-sonic-background flex flex-col items-center justify-center space-y-4 p-6">
      <div className="text-r-sonic-foreground text-center">
        <div className="text-[16px] font-bold mb-2">
          {t('page.ecology.sonic.points.errorTitle')}
        </div>
        <div className="text-[14px] opacity-80 max-w-[80ch] text-center">
          {t('page.ecology.sonic.points.errorDesc')}
        </div>
      </div>
      <SonicButton onClick={onRetry} rounded>
        {t('page.ecology.sonic.points.retry')}
      </SonicButton>
    </div>
  );
};

const SonicPoints = () => {
  const {
    loading,
    error,
    refetch,
    referralCode,
    totalPoints,
    address,
  } = useSonicData();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  return (
    <div className="h-[100vh] min-h-[100vh] flex flex-col bg-r-sonic-background text-r-sonic-foreground relative">
      {error && !loading && <ErrorOverlay onRetry={refetch} />}
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
          {loading ? (
            <div className="h-[58px] w-[200px] bg-white/30 animate-pulse rounded-lg" />
          ) : (
            totalPoints.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          )}
        </div>
        <button
          onClick={() => copyAddress(address ?? '')}
          className="text-[14px] text-r-sonic-foreground/80"
        >
          {ellipsis(address ?? '')}
        </button>
      </div>
      <div className="rounded-t-[20px] bg-rabby-sonic-background p-[20px] mt-[-20px] flex flex-col gap-[16px]">
        <div className="flex flex-col items-start gap-[8px]">
          <div className="text-[14px] text-r-sonic-foreground font-bold">
            {t('page.ecology.sonic.points.referralCode')}:
          </div>
          <CodeAndShare referralCode={referralCode} loading={loading} />
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
