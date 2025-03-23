import { openExternalWebsiteInTab } from '@/ui/utils';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { message } from 'antd';
import { t } from 'i18next';
import React, { useState } from 'react';
import IconSuccess from 'ui/assets/success.svg';
import { CheckedIcon, CopyIcon } from './Icons';

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

export const shareSonicPointsX = ({
  referralCode,
}: {
  referralCode?: string;
}) => {
  if (!referralCode) return;

  const text = encodeURIComponent(`Earn points for the ~200m $S airdrop with free play-to-earn games on #SonicArcade:    
  
https://airdrop.soniclabs.com/?ref=${referralCode}`);

  openExternalWebsiteInTab(`https://x.com/intent/post?text=${text}`);
};

export const CodeAndShare = ({
  referralCode,
  loading,
}: {
  referralCode: string;
  loading: boolean;
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopyReferralCode = () => {
    copyTextToClipboard(referralCode);
    setHasCopied(true);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.ecology.sonic.points.referralCodeCopied'),
    });
    setTimeout(() => {
      setHasCopied(false);
    }, 3000);
  };

  return (
    <div className="flex items-center justify-evenly w-full gap-[8px]">
      <button
        disabled={loading}
        onClick={() => {
          if (referralCode) {
            handleCopyReferralCode();
          } else {
            openExternalWebsiteInTab('https://airdrop.soniclabs.com/referral');
          }
        }}
        className={`bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] flex w-full items-center justify-center gap-[10px] font-bold border border-rabby-sonic-card-border transition-all duration-200 ${
          hasCopied ? 'scale-[1.02] shadow' : 'hover:scale-[1.02] hover:shadow'
        } ${
          loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        }`}
      >
        {loading ? (
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
      {(referralCode || loading) && (
        <button
          disabled={loading}
          className={`bg-rabby-sonic-card text-rabby-sonic-card-foreground rounded-[8px] px-[12px] py-[8px] flex w-full items-center justify-center gap-[10px] font-bold border border-rabby-sonic-card-border transition-all duration-200 hover:scale-[1.02] hover:shadow ${
            loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
          onClick={() => shareSonicPointsX({ referralCode })}
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
  );
};
