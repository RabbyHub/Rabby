import { PageHeader } from '@/ui/component';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsisAddress } from '@/ui/utils/address';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import imgBg from 'ui/assets/rabby-points/rabby-points-bg.png';
import { Tabs, message } from 'antd';
import { SetReferralCode } from './component/ReferrralCode';
import { ClaimItem, ClaimLoading } from './component/ClaimItem';
import { TopUserItem } from './component/TopBoard';
import { ClaimRabbyPointsModal } from './component/ClaimRabbyPointsModal';
import { ClaimRabbyVerifyModal } from './component/VerifyAddressModal';
import { useHistory } from 'react-router-dom';
import { formatTokenAmount, isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyPoints } from './hooks';
import { ClaimUserAvatar } from './component/ClaimUserAvatar';
import CountUp from 'react-countup';
import clsx from 'clsx';
import { CodeAndShare } from './component/CodeAndShare';

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
    &.ant-tabs {
      overflow: initial;
    }
    .ant-tabs-nav {
      margin-bottom: 0;
    }
    .ant-tabs-content {
      /* max-height: 100%; */
    }
    .ant-tabs-nav {
      position: sticky;
      top: -16px;
      background: var(--r-neutral-bg1, #fff);
      z-index: 10;
    }
    .ant-tabs-tab + .ant-tabs-tab {
      margin: 0;
    }
    .ant-tabs-tab-btn {
      color: var(--r-neutral-body, #3e495e);
      &:hover {
        color: var(--r-blue-default, #7084ff);
      }
    }
    .ant-tabs-nav-list {
      flex: 1;
      .ant-tabs-tab {
        flex: 1;
        justify-content: center;
        padding-top: 10px;
        padding-bottom: 7px;
      }
    }
    .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
      color: var(--r-blue-default, #7084ff);
    }

    .ant-tabs-nav::before {
      border-bottom: 0.5px solid var(--r-neutral-line, #d3d8e0) !important;
    }
  }
`;

const RabbyPoints = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const account = useCurrentAccount();

  const [currentUserCode, setCurrentUserCode] = useState<string | undefined>();
  const [claimedIds, setClaimedIds] = useState<number[]>([]);
  const [claimItemLoading, setClaimItemLoading] = useState<
    Record<number, boolean>
  >({});

  const {
    campaignIsEnded,
    campaignIsEndedLoading,
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
  const userName = React.useMemo(
    () => userPointsDetail?.web3_id || ellipsisAddress(account?.address || ''),
    [userPointsDetail?.web3_id, account?.address]
  );
  const [visible, setVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [previousPoints, setPreviousPoints] = useState(0);

  const [currentPoints, setCurrentPoint] = useState(0);
  const [showDiffPoints, setShowDiffPoints] = useState(false);
  const [diffPoints, setDiffPoints] = useState(0);

  const [codeModalVisible, setCodeModalVisible] = useState(false);

  const openSetCodeModal = React.useCallback(() => {
    setCodeModalVisible(true);
  }, []);

  const closeSetCodeModal = React.useCallback(() => {
    setCodeModalVisible(false);
  }, []);

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
  const hadInvitedCode = !userLoading ? !!invitedCode : true;
  const initRef = useRef(false);

  const lockRef = useRef(false);

  const claimSnapshot = React.useCallback(
    async (invite_code?: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      try {
        wallet.rabbyPointVerifyAddress({
          code: invite_code,
          claimSnapshot: true,
        });
        window.close();
      } catch (error) {
        console.error(error);
        message.error(String(error?.message || error));
      }
      lockRef.current = false;
    },
    [account?.address, wallet?.openapi]
  );

  const verifyAddr = React.useCallback(() => {
    try {
      wallet.rabbyPointVerifyAddress();
      window.close();
    } catch (error) {
      console.error(error);
    }
  }, [wallet.rabbyPointVerifyAddress]);

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
            setDiffPoints(points);
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
        message.success(t('page.rabbyPoints.code-set-successfully'), 2);
      }
    },
    [wallet.openapi, account?.address, signature]
  );

  const ended = useMemo(() => !!campaignIsEnded, [campaignIsEnded]);

  useEffect(() => {
    if (
      !initRef.current &&
      !signatureLoading &&
      !snapshotLoading &&
      !campaignIsEndedLoading
    ) {
      if (snapshot && !snapshot?.claimed && !ended) {
        setVisible(true);
        setVerifyVisible(false);
      } else if (!signature) {
        setVisible(false);
        setVerifyVisible(true);
      }
      initRef.current = true;
    }
  }, [snapshot, signatureLoading, campaignIsEndedLoading, signature]);

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

  return (
    <Wrapper className="leading-normal flex flex-col">
      <PageHeader
        closeable={false}
        className="mx-[20px]"
        forceShowBack
        onBack={() => {
          history.push('/dashboard');
        }}
      >
        <span className="text-[20px] font-medium text-r-neutral-title2">
          {t('page.rabbyPoints.title')}
        </span>
      </PageHeader>
      <div className="text-r-neutral-title2 flex flex-col items-center relative top-[10px]">
        <div className="flex items-center justify-center gap-[6px]">
          <ClaimUserAvatar src={avatar} className="w-[20px] h-[20px]" />
          <span className="text-[15px]">{userName}</span>
        </div>
        <div>
          <span
            className={clsx(
              ' relative transition-opacity',
              ended && !snapshot?.claimed
                ? 'text-20 font-bold mt-20 mb-[25px] inline-block'
                : 'text-[40px] font-extrabold mt-[8px] mb-[12px]',
              userLoading && 'opacity-80'
            )}
          >
            {ended && !snapshot?.claimed ? (
              t('page.rabbyPoints.initialPointsClaimEnded')
            ) : (
              <CountUp
                start={previousPoints}
                end={currentPoints}
                duration={1}
                separator=","
                onStart={() => {
                  if (previousPoints !== currentPoints) {
                    setDiffPoints(currentPoints - previousPoints);
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
            )}
            {showDiffPoints && (
              <span className="absolute right-0 top-[-12px] text-[14px] font-normal">
                +{diffPoints}
              </span>
            )}
          </span>
        </div>

        <div className="opacity-70 pb-[34px]">
          {t('page.rabbyPoints.out-of-x-current-total-points', { total })}
        </div>
      </div>

      <div className="rounded-t-[16px] bg-r-neutral-bg-1 flex-1 overflow-auto pt-[16px] flex flex-col">
        <div className="px-20">
          {!hadInvitedCode ? (
            ended ? null : (
              <SetReferralCode
                onSetCode={setReferralCode}
                visible={codeModalVisible}
                onOpen={openSetCodeModal}
                onClose={closeSetCodeModal}
              />
            )
          ) : (
            <CodeAndShare
              invitedCode={invitedCode}
              snapshot={snapshot}
              loading={userLoading || snapshotLoading}
              usedOtherInvitedCode={!!(userPointsDetail as any)?.inviter_code}
            />
          )}
        </div>

        <Tabs centered defaultActiveKey="1" className="rabby-points-tabs">
          <Tabs.TabPane
            tab={
              <div className="w-[192px] pl-[20px]  text-[16px] leading-normal font-medium text-center">
                {t('page.rabbyPoints.earn-points')}
              </div>
            }
            key={'1'}
          >
            {ended && (
              <div className="mx-20 mt-20 mb-4 flex justify-center rounded-[6px] bg-r-neutral-card-2 py-12 text-13 text-r-neutral-title-1 font-medium">
                {t('page.rabbyPoints.secondRoundEnded')}
              </div>
            )}
            <div className="flex flex-col gap-[12px] py-[16px] px-[20px] ">
              {activitiesLoading ? (
                <ClaimLoading />
              ) : (
                activities?.map((item) => (
                  <ClaimItem
                    {...item}
                    onClaim={claimItem}
                    claimLoading={claimItemLoading[item.id]}
                    key={item.id}
                    claimable={
                      item.claimable_points > 0 && !claimedIds.includes(item.id)
                    }
                  />
                ))
              )}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane
            tab={
              <div className="pr-[10px]  text-[16px] leading-normal font-medium text-center">
                {t('page.rabbyPoints.top-100')}
              </div>
            }
            key={'2'}
          >
            <div className=" flex flex-col  pt-[16px] pb-[66px]">
              {topUsers?.map((item, index) => (
                <TopUserItem {...item} index={index} key={item.id} />
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
        userInvitedCode={userPointsDetail?.invite_code}
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
