import { formatTokenAmount, openInTab } from '@/ui/utils';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { Skeleton, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconCopy } from 'ui/assets/rabby-points/copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import { useRabbyPoints } from '../hooks';
import { ReactComponent as IconTwitter } from 'ui/assets/rabby-points/twitter-x.svg';

export const shareRabbyPointsTwitter = ({
  snapshot,
  invitedCode,
}: {
  snapshot?: ReturnType<typeof useRabbyPoints>['snapshot'];
  usedOtherInvitedCode?: boolean;
  invitedCode?: string;
}) => {
  if (!snapshot) return;

  const text = encodeURIComponent(`Even if you haven't used Rabby before, you can get points now!

Rabby Points Season 2 is here with bigger rewards – 1 Billion points in total! 🎉 @Rabby_io

Check your points before you claim!

Use my referral code ${invitedCode} for an extra bonus!

https://rabby.io/points?code=${invitedCode}
`);

  openInTab(`https://twitter.com/intent/tweet?text=${text}`);
};

export const CodeAndShare = ({
  invitedCode,
  snapshot,
  loading,
  usedOtherInvitedCode,
}: {
  loading?: boolean;
  invitedCode?: string;
  snapshot?: ReturnType<typeof useRabbyPoints>['snapshot'];
  usedOtherInvitedCode?: boolean;
}) => {
  const { t } = useTranslation();
  const copyInvitedCode = React.useCallback(() => {
    copyTextToClipboard(invitedCode || '');
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.rabbyPoints.referral-code-copied'),
    });
  }, [invitedCode]);

  const share = React.useCallback(() => {
    shareRabbyPointsTwitter({ snapshot, usedOtherInvitedCode, invitedCode });
  }, [snapshot, usedOtherInvitedCode, invitedCode]);

  if (loading) {
    return <CodeAndShareLoading />;
  }

  return (
    <div className="flex items-center justify-between text-[13px] font-medium text-r-neutral-title1">
      <div
        onClick={copyInvitedCode}
        className="border border-transparent hover:bg-rabby-blue-light1 hover:border hover:border-rabby-blue-default cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-r-neutral-card2"
      >
        <span>{invitedCode?.toUpperCase()}</span>
        <IconCopy className="w-[16px]" />
      </div>
      <div
        onClick={share}
        className="border border-transparent hover:bg-rabby-blue-light1 hover:border hover:border-rabby-blue-default cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-r-neutral-card2"
      >
        <span>{t('page.rabbyPoints.share-on')}</span>
        <IconTwitter className="w-[16px]" />
      </div>
    </div>
  );
};

const CodeAndShareLoading = () => {
  return (
    <div className="flex items-center justify-between">
      <Skeleton.Input
        className="rounded-[6px]"
        style={{
          width: 172,
          height: 40,
        }}
      />
      <Skeleton.Input
        className="rounded-[6px]"
        style={{
          width: 172,
          height: 40,
        }}
      />
    </div>
  );
};
