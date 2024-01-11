import { PageHeader } from '@/ui/component';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsisAddress } from '@/ui/utils/address';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import imgBg from 'ui/assets/rabby-points/rabby-points-bg.png';
import { ReactComponent as IconCopy } from 'ui/assets/rabby-points/copy.svg';
import { ReactComponent as IconTwitter } from 'ui/assets/rabby-points/twitter-x.svg';
import { Tabs, message } from 'antd';
import { SetReferralCode } from './component/ReferrralCode';
import { ClaimItem } from './component/ClaimItem';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import IconSuccess from 'ui/assets/success.svg';
import { TopUserItem } from './component/TopBoard';
import { ClaimRabbyPointsModal } from './component/ClaimRabbyPointsModal';
import { ClaimRabbyVerifyModal } from './component/VerifyAddressModal';

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

const template = {
  id: 1,
  title: 'Refer New User',
  desc: '每邀请一个用户,可获得500积分',
  expired_at: 1704619865, // 活动过期时间
  claimable_points: 1000, // 当前地址可领取的积分
};

const topTemplate = {
  id: '0x...',
  logo_url: '...',
  web3_id: 'test',
  claimed_points: 1111, // 当前地址领取的积分
};

const RabbyPoints = () => {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const avatar = '';
  const addr = React.useMemo(() => ellipsisAddress(account?.address || ''), [
    account?.address,
  ]);
  const [visible, setVisible] = useState(false);
  const [verifyVisible, setVerifyVisible] = useState(true);

  const points = '56,300';
  const total = '2,892,929';
  const invitedCode = 'FSAF453';
  const hadInvitedCode = false;

  const copyInvitedCode = () => {
    copyTextToClipboard(invitedCode);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: 'Referral code copied',
    });
  };

  const shareTwitter = () => {
    //TODO
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
          <img src={avatar} className="w-[20px] h-[20px]" />
          <span className="text-[15px]">{addr}</span>
        </div>

        <div className="text-[40px] font-extrabold mt-[8px] mb-[12px]">
          {points}
        </div>

        <div className="opacity-70 pb-[34px]">
          {t('page.rabbyPoints.out-of-x-current-total-points', { total })}
        </div>
      </div>

      <div className="rounded-t-[16px] bg-r-neutral-bg-1 flex-1 overflow-auto pt-[20px] flex flex-col">
        <div className="px-20">
          {hadInvitedCode ? (
            <SetReferralCode />
          ) : (
            <div className="flex items-center justify-between">
              <div
                onClick={copyInvitedCode}
                className="cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-r-neutral-card2"
              >
                <span>{invitedCode}</span>
                <IconCopy className="w-[16px]" />
              </div>
              <div
                onClick={shareTwitter}
                className="rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-r-neutral-card2"
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
            tab="Claim Points"
            key={'1'}
            className="max-h-full flex-1"
          >
            <div className="overflow-auto flex flex-col gap-[12px] py-[16px] px-[20px] max-h-full">
              <ClaimItem {...template} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Top 100" key={'2'}>
            <div className="overflow-auto flex flex-col  pt-[16px] max-h-full">
              <TopUserItem {...topTemplate} index={1} />
              <TopUserItem {...topTemplate} index={2} />
              <TopUserItem {...topTemplate} index={3} />
              <TopUserItem {...topTemplate} index={4} />
              <TopUserItem {...topTemplate} index={5} />
              <TopUserItem {...topTemplate} index={6} />
              <TopUserItem {...topTemplate} index={7} />
              <TopUserItem {...topTemplate} index={8} />

              <TopUserItem {...topTemplate} index={1} showCurrentUser />
              <div className="h-[16]" />
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

      <ClaimRabbyPointsModal
        visible={visible}
        onCancel={() => {
          setVisible(false);
        }}
      />
      <ClaimRabbyVerifyModal
        visible={verifyVisible}
        onCancel={() => {
          setVerifyVisible(false);
        }}
      />
    </Wrapper>
  );
};

export default RabbyPoints;
