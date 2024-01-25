import { formatTokenAmount, openInTab } from '@/ui/utils';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { Skeleton, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconCopy } from 'ui/assets/rabby-points/copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import { useRabbyPoints } from '../hooks';
import { ReactComponent as IconTwitter } from 'ui/assets/rabby-points/twitter-x.svg';

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

  const shareTwitter = () => {
    if (!snapshot) return;
    const {
      address_balance,
      metamask_swap,
      rabby_nadge,
      rabby_nft,
      rabby_old_user,
      extra_bouns,
    } = snapshot;

    const sum =
      address_balance +
      metamask_swap +
      rabby_nadge +
      rabby_nft +
      rabby_old_user +
      (usedOtherInvitedCode ? extra_bouns : 0);
    const score = formatTokenAmount(sum, 0);

    let text = encodeURIComponent(`Just scored ${score} Rabby Points with a few clicks, and you can get extra points for migrating  MetaMask wallet into Rabby!

Everyone can get points, and use my referral code '${invitedCode}' for an extra bonus.   
 
Ready to claim? @Rabby_io

https://rabby.io/rabby-points?code=${invitedCode}
`);
    if (snapshot.metamask_swap) {
      text = encodeURIComponent(`Just scored ${score} Rabby Points with a few clicks, and got extra ${formatTokenAmount(
        snapshot.metamask_swap,
        0
      )} points for migrating my MetaMask wallet into Rabby!

Everyone can get points, and use my referral code '${invitedCode}' for an extra bonus.   

Ready to claim? @Rabby_io

https://rabby.io/rabby-points?code=${invitedCode}
`);
    }

    if (sum === 0) {
      text = encodeURIComponent(`Claim Rabby Points with a few clicks, and you can get extra points for migrating  MetaMask wallet into Rabby!

Everyone can get points, and use my referral code '${invitedCode}' for an extra bonus.   

Ready to claim? @Rabby_io

https://rabby.io/rabby-points?code=${invitedCode}
`);
    }

    openInTab(`https://twitter.com/intent/tweet?text=${text}`);
  };

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
        onClick={shareTwitter}
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
