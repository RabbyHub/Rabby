import { PageHeader } from '@/ui/component';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsisAddress } from '@/ui/utils/address';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import imgBg from 'ui/assets/rabby-points/rabby-points-bg.png';
import { ReactComponent as IconCopy } from 'ui/assets/rabby-points/copy.svg';
import { ReactComponent as IconTwitter } from 'ui/assets/rabby-points/twitter-x.svg';
import { Tabs, message } from 'antd';
import { SetReferralCode } from './component/ReferrralCode';
import { ClaimItem, ClaimLoading } from './component/ClaimItem';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import IconSuccess from 'ui/assets/success.svg';
import { TopUserItem } from './component/TopBoard';
import { ClaimRabbyPointsModal } from './component/ClaimRabbyPointsModal';
import { ClaimRabbyVerifyModal } from './component/VerifyAddressModal';
import { useHistory } from 'react-router-dom';
import {
  formatTokenAmount,
  isSameAddress,
  openInTab,
  useWallet,
} from '@/ui/utils';
import { useRabbyPoints } from './hooks';
import { ClaimUserAvatar } from './component/ClaimUserAvatar';
import CountUp from 'react-countup';

const Wrapper = styled.div`
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  position: relative;
  z-index: 1;
  background-image: url(${imgBg});
  background-repeat: no-repeat;
  background-position: top;
  background-size: 400px 243px;
  .header {
    color: var(--r-neutral-title2, #fff);
  }
  svg.icon.icon-back path {
    fill: white !important;
  }
  .rabby-points-tabs {
    .ant-tabs-nav {
      margin-bottom: 0;
    }
    .ant-tabs-content {
      max-height: 100%;
    }
    .ant-tabs-nav-list {
      flex: 1;
      .ant-tabs-tab {
        flex: 1;
        justify-content: center;
      }
    }
  }
`;

const RabbyPoints = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const account = useCurrentAccount();
  const [snapshotState, setSnapshotState] = useState<{
    usedCode?: string;
    claimSnapshot?: boolean;
  }>({});
  const [currentUserCode, setCurrentUserCode] = useState<string | undefined>();
  const [claimedIds, setClaimedIds] = useState<number[]>([]);
  const [claimItemLoading, setClaimItemLoading] = useState<
    Record<number, boolean>
  >({});

  const {
    refreshUserPoints,
    signature,
    signatureLoading,
    snapshot,
    snapshotLoading,
    userPointsDetail,
    userLoading,
    topUsers,
    topUsersLoading,
    activities,
    activitiesLoading,
  } = useRabbyPoints();

  const avatar =
    userPointsDetail?.logo_thumbnail_url || userPointsDetail?.logo_url;
  const addr = React.useMemo(() => ellipsisAddress(account?.address || ''), [
    account?.address,
  ]);
  const [visible, setVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [previousPoints, setPreviousPoints] = useState(0);

  const [currentPoints, setCurrentPoint] = useState(0);
  const [showDiffPoints, setShowDiffPoints] = useState(false);

  useEffect(() => {
    setPreviousPoints(userPointsDetail?.claimed_points || 0);
    setCurrentPoint(userPointsDetail?.claimed_points || 0);
  }, [userPointsDetail?.claimed_points]);

  const total = useMemo(
    () =>
      userPointsDetail?.total_claimed_points
        ? formatTokenAmount(userPointsDetail?.total_claimed_points, 0)
        : '',
    [userPointsDetail?.total_claimed_points]
  );
  const invitedCode = currentUserCode || userPointsDetail?.invite_code;
  const hadInvitedCode = !userLoading ? !!userPointsDetail?.invite_code : true;
  const initRef = useRef(false);

  const claimSnapshot = React.useCallback(
    (invite_code?: string) => {
      if (account?.address && signature) {
        wallet.openapi.claimRabbyPointsSnapshot({
          id: account?.address,
          signature,
          invite_code,
        });
      }
      if (!signature) {
        setSnapshotState({
          usedCode: invite_code,
          claimSnapshot: true,
        });
        setVisible(false);
        setVerifyVisible(true);
        return;
      }
    },
    [signature, snapshotState, account?.address, wallet?.openapi]
  );

  const verifyAddr = React.useCallback(() => {
    try {
      wallet.rabbyPointVerifyAddress({
        code: snapshotState.usedCode,
        claimSnapshot: snapshotState.claimSnapshot,
      });
      window.close();
    } catch (error) {
      console.error(error);
    }
  }, [snapshotState, wallet.rabbyPointVerifyAddress]);

  const claimItem = React.useCallback(
    async (campaign_id: number, points: number) => {
      if (account?.address && signature) {
        try {
          if (claimItemLoading[campaign_id]) {
            return;
          }
          setClaimItemLoading((e) => ({ ...e, [campaign_id]: true }));
          await wallet.openapi.claimRabbyPointsById({
            user_id: account?.address,
            campaign_id: campaign_id,
            signature,
          });
          setCurrentPoint((e) => {
            setPreviousPoints(e);
            return e + points;
          });
          refreshUserPoints();
          setClaimedIds((e) =>
            e.includes(campaign_id) ? e : [...e, campaign_id]
          );
        } catch (error) {
          message.error(String(error?.message || error));
        } finally {
          setClaimItemLoading((e) => ({ ...e, [campaign_id]: false }));
        }
      }
    },
    [
      signature,
      refreshUserPoints,
      account?.address,
      wallet?.openapi?.claimRabbyPointsById,
    ]
  );

  const setReferralCode = React.useCallback(
    async (code: string) => {
      if (account?.address && signature) {
        await wallet.openapi.setRabbyPointsInviteCode({
          id: account?.address,
          signature,
          invite_code: code,
        });
        setCurrentUserCode(code);
      }
    },
    [wallet.openapi, account?.address]
  );

  useEffect(() => {
    if (!initRef.current && !signatureLoading && !snapshotLoading) {
      if (snapshot && !snapshot?.claimed) {
        setVisible(true);
        setVerifyVisible(false);
      } else if (!signature) {
        setVisible(false);
        setVerifyVisible(true);
      }
      initRef.current = true;
    }
  }, [snapshot, signature]);

  useEffect(() => {
    wallet.clearPageStateCache();
  }, []);

  const currentUserIdx = useMemo(() => {
    if (topUsers && account?.address) {
      const idx = topUsers?.findIndex((e) =>
        isSameAddress(e.id, account.address)
      );

      if (idx !== -1) {
        return idx;
      }
    }
    return 1000;
  }, [topUsers, account?.address]);

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
    const score = formatTokenAmount(
      address_balance +
        metamask_swap +
        rabby_nadge +
        rabby_nft +
        rabby_old_user +
        extra_bouns,
      0
    );
    const text = encodeURIComponent(`Just scored ${score} Rabby Points with a few clicks, and got extra ${formatTokenAmount(
      snapshot.extra_bouns,
      0
    )} points for migrating my MetaMask wallet into Rabby!

Everyone can get points, and use my referral code ${invitedCode} for an extra bonus.   
 
Ready to claim your points?`);
    // openInTab(
    //   `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(
    //     'https://debank.com'
    //   )}`
    // );

    openInTab(`https://twitter.com/intent/tweet?text=${text}`);
  };
  return (
    <Wrapper className="leading-normal flex flex-col">
      <PageHeader closeable={false} className="mx-[20px]">
        <span className="text-[20px] font-medium text-r-neutral-title2">
          {t('page.rabbyPoints.title')}
        </span>
      </PageHeader>
      <div className="text-r-neutral-title2 flex flex-col items-center">
        <div className="flex items-center justify-center gap-[4px]">
          <ClaimUserAvatar src={avatar} className="w-[20px] h-[20px]" />
          <span className="text-[15px]">{addr}</span>
        </div>
        <div>
          <span className="text-[40px] font-extrabold mt-[8px] mb-[12px] relative">
            <CountUp
              start={previousPoints}
              end={currentPoints}
              duration={1}
              separator=","
              onStart={() => {
                if (previousPoints !== currentPoints) {
                  setShowDiffPoints(true);
                }
              }}
              onEnd={() => {
                setShowDiffPoints(false);
              }}
              onUpdate={() => {
                if (previousPoints !== currentPoints) {
                  setShowDiffPoints(true);
                }
              }}
            />
            {showDiffPoints && (
              <span className="absolute right-0 top-[-12px] text-[14px] font-normal">
                +{currentPoints - previousPoints}
              </span>
            )}
          </span>
        </div>

        <div className="opacity-70 pb-[34px]">
          {t('page.rabbyPoints.out-of-x-current-total-points', { total })}
        </div>
      </div>

      <div className="rounded-t-[16px] bg-r-neutral-bg-1 flex-1 overflow-auto pt-[20px] flex flex-col">
        <div className="px-20">
          {!hadInvitedCode ? (
            <SetReferralCode onSetCode={setReferralCode} />
          ) : (
            <div className="flex items-center justify-between">
              <div
                onClick={copyInvitedCode}
                className="cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-r-neutral-card2"
              >
                <span>{invitedCode?.toUpperCase()}</span>
                <IconCopy className="w-[16px]" />
              </div>
              <div
                onClick={shareTwitter}
                className="cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-r-neutral-card2"
              >
                <span>{t('page.rabbyPoints.share-on')}</span>
                <IconTwitter className="w-[16px]" />
              </div>
            </div>
          )}
        </div>

        <Tabs
          centered
          defaultActiveKey="1"
          className="rabby-points-tabs flex-1"
        >
          <Tabs.TabPane
            tab={t('page.rabbyPoints.claim-points')}
            key={'1'}
            className="max-h-full flex-1"
          >
            <div className="overflow-auto flex flex-col gap-[12px] py-[16px] px-[20px] max-h-full">
              {activitiesLoading ? (
                <ClaimLoading />
              ) : (
                activities
                  ?.sort((a, b) => {
                    let a1 = 0;
                    let b1 = 0;
                    if (claimedIds.includes(a.id)) {
                      a1 = 1;
                    }
                    if (claimedIds.includes(b.id)) {
                      b1 = 1;
                    }
                    return b1 - a1;
                  })
                  .map((item) => (
                    <ClaimItem
                      {...item}
                      onClaim={claimItem}
                      claimLoading={claimItemLoading[item.id]}
                      key={item.id}
                      claimable={
                        item.claimable_points > 0 &&
                        !claimedIds.includes(item.id)
                      }
                    />
                  ))
              )}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab={t('page.rabbyPoints.top-100')} key={'2'}>
            <div className="overflow-auto flex flex-col  pt-[16px] pb-[66px] max-h-full">
              {topUsers?.map((item, index) => (
                <TopUserItem {...item} index={index} />
              ))}
              {topUsers &&
                userPointsDetail &&
                userPointsDetail.claimed_points !== null && (
                  <TopUserItem
                    {...userPointsDetail}
                    index={currentUserIdx}
                    showCurrentUser
                  />
                )}
              <div className="h-[16]" />
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

      <ClaimRabbyPointsModal
        web3Id={userPointsDetail?.web3_id}
        logo={
          userPointsDetail?.logo_thumbnail_url || userPointsDetail?.logo_url
        }
        visible={visible}
        onClaimed={claimSnapshot}
        onCancel={() => {
          setVisible(false);
          history.goBack();
        }}
        snapshot={snapshot}
        snapshotLoading={snapshotLoading}
      />
      <ClaimRabbyVerifyModal
        visible={verifyVisible}
        onCancel={() => {
          setVerifyVisible(false);
          history.goBack();
        }}
        onConfirm={verifyAddr}
      />
    </Wrapper>
  );
};

export default RabbyPoints;
