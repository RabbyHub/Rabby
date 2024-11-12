import pointsLightImg from '@/ui/assets/ecology/sonic/points-bg-light.png';
import pointsDarkImg from '@/ui/assets/ecology/sonic/points-bg.png';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useCopy } from '@/ui/utils/useCopy';
import { formatAddress } from '@/utils';
import { error } from 'console';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SonicButton } from '../../components/SonicButton';
import { SonicCard } from '../../components/SonicCard';
import { useSonicPoints, useSonicReferralCode } from './hooks';

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
      <SonicButton rounded onClick={cta.onClick}>
        {cta.text}
      </SonicButton>
    </SonicCard>
  );
};

const Spinner = () => (
  <div className="animate-spin w-[20px] h-[20px]">
    <svg viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
);

const CopyIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.3333 6H7.33333C6.59695 6 6 6.59695 6 7.33333V13.3333C6 14.0697 6.59695 14.6667 7.33333 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V7.33333C14.6667 6.59695 14.0697 6 13.3333 6Z"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.33333 10H2.66667C2.31305 10 1.97391 9.85953 1.72386 9.60948C1.47381 9.35943 1.33334 9.02029 1.33334 8.66667V2.66667C1.33334 2.31305 1.47381 1.97391 1.72386 1.72386C1.97391 1.47381 2.31305 1.33334 2.66667 1.33334H8.66667C9.02029 1.33334 9.35943 1.47381 9.60948 1.72386C9.85953 1.97391 10 2.31305 10 2.66667V3.33334"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckedIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.3334 4L6.00008 11.3333L2.66675 8"
      stroke="currentColor"
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
    points,
    pointsLoading,
    error: pointsError,
    refetch: refetchPoints,
    address,
  } = useSonicPoints();
  const {
    referralCode,
    referralLoading,
    error: referralError,
    refetch: refetchReferral,
  } = useSonicReferralCode();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const { copyToClipboard, hasCopied } = useCopy();

  return (
    <div className="h-[100vh] min-h-[100vh] flex flex-col bg-r-sonic-background text-r-sonic-foreground relative">
      {pointsError && !pointsLoading ? (
        <ErrorOverlay onRetry={refetchPoints} />
      ) : (
        referralError &&
        !referralLoading && <ErrorOverlay onRetry={refetchReferral} />
      )}
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
          {pointsLoading ? (
            <div className="h-[58px] w-[200px] bg-white/30 animate-pulse rounded-lg" />
          ) : (
            (points?.totalPoints ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          )}
        </div>
        <div className="text-[14px] text-r-sonic-foreground/80">
          {pointsLoading ? (
            <div className="h-[20px] w-[120px] bg-white/30 animate-pulse rounded-lg" />
          ) : (
            formatAddress(address)
          )}
        </div>
      </div>
      <div className="rounded-t-[20px] bg-rabby-sonic-background p-[20px] mt-[-20px] flex flex-col gap-[16px]">
        <div className="flex flex-col items-start gap-[8px]">
          <div className="text-[14px] text-r-sonic-foreground font-bold">
            {t('page.ecology.sonic.points.referralCode')}:
          </div>
          <div className="flex items-center justify-evenly w-full gap-[8px]">
            <button
              disabled={referralLoading}
              onClick={() => {
                if (referralCode) {
                  copyToClipboard(referralCode);
                } else {
                  window.open(
                    'https://airdrop.soniclabs.com/referral',
                    '_blank'
                  );
                }
              }}
              className={`bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] flex w-full items-center justify-center gap-[10px] font-bold border border-rabby-sonic-card-border transition-all duration-200 ${
                hasCopied
                  ? 'scale-[1.02] shadow'
                  : 'hover:scale-[1.02] hover:shadow'
              } ${
                referralLoading
                  ? 'opacity-50 cursor-not-allowed pointer-events-none'
                  : ''
              }`}
            >
              {referralLoading ? (
                <Spinner />
              ) : referralCode ? (
                <>
                  <div>{referralCode}</div>
                  {hasCopied ? <CheckedIcon /> : <CopyIcon />}
                </>
              ) : (
                <div>{t('page.ecology.sonic.points.getReferralCode')}</div>
              )}
            </button>
            {(referralCode || referralLoading) && (
              <button
                disabled={referralLoading}
                className={`bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] flex w-full items-center justify-center gap-[10px] font-bold border border-rabby-sonic-card-border transition-all duration-200 hover:scale-[1.02] hover:shadow ${
                  referralLoading
                    ? 'opacity-50 cursor-not-allowed pointer-events-none'
                    : ''
                }`}
                onClick={() => {
                  window.open(
                    `https://x.com/intent/tweet?text=${encodeURIComponent(
                      t('page.ecology.sonic.points.referralCodeShare', {
                        referralCode,
                      })
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
            )}
          </div>
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
