import React, { useMemo, useState } from 'react';

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { ProfileHeader } from './components/ProfileHeader';
import { Tabs } from 'antd';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { TokensTabPane } from './components/TokensTabPane';
import { SendTokenModal } from './components/SendTokenModal';
import { DesktopSelectAccountList } from '@/ui/component/DesktopSelectAccountList';
import { SwapTokenModal } from './components/SwapTokenModal';
import ApprovalManagePage from '../ApprovalManagePage';
import { TransactionsTabPane } from './components/TransactionsTabPane';
import { DesktopChainSelector } from '../DesktopChainSelector';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { findChainByEnum } from '@/utils/chain';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useCurve } from '../Dashboard/components/BalanceView/useCurve';
import { useDesktopBalanceView } from './hooks/useDesktopBalanceView';
import { UpdateButton } from './components/UpdateButton';
import { useMemoizedFn } from 'ahooks';

const Wrap = styled.div`
  height: 100%;
  width: 100%;
  overflow: auto;
  background: var(--r-neutral-bg2, #f2f4f7);

  .x-container {
    padding-left: 20px;
    padding-right: 20px;
    max-width: 1440px;
    margin-left: auto;
    margin-right: auto;
  }

  /* antd */
  .ant-tabs-tab {
    color: var(--r-neutral-foot, #6a7587);
    font-size: 15px;
    font-weight: 500;
    line-height: 18px;

    padding-top: 15px;
    padding-bottom: 15px;
  }
  .ant-tabs > .ant-tabs-nav .ant-tabs-nav-wrap {
    padding-left: 20px;
  }
  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--r-blue-default, #4c65ff);
    text-shadow: none;
  }
  .ant-tabs-top > .ant-tabs-nav .ant-tabs-ink-bar {
    height: 3px;
    background-color: var(--r-blue-default, #4c65ff);
  }
  .ant-tabs-top > .ant-tabs-nav {
    margin-bottom: 0;
  }
`;

export const DesktopProfile = () => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();

  const history = useHistory();
  const activeTab = useParams<{ activeTab: string }>().activeTab || 'tokens';
  const handleTabChange = (key: string) => {
    history.replace(`/desktop/profile/${key}`);
  };
  const location = useLocation();
  const action = new URLSearchParams(location.search).get('action');
  const chain = useRabbySelector((store) => store.desktopProfile.chain);
  const dispatch = useRabbyDispatch();
  const chainInfo = useMemo(() => findChainByEnum(chain), [chain]);
  const shouldElevateAccountList =
    action === 'send' || action === 'swap' || action === 'bridge';

  const {
    balance,
    evmBalance,
    curveChartData,
    isBalanceLoading,
    isCurveLoading,
    refreshBalance,
    refreshCurve,
  } = useDesktopBalanceView({
    address: currentAccount?.address,
  });

  const isUpdating = isBalanceLoading || isCurveLoading;
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [refreshKey, setRefreshKey] = useState(0);
  const handleUpdate = useMemoizedFn(async () => {
    setRefreshKey((prev) => prev + 1);
    await refreshBalance();
    await refreshCurve();
    // todo
    setUpdatedAt(Date.now());
  });

  return (
    <>
      <Wrap className="w-full h-full bg-r-neutral-bg2">
        <div className="x-container">
          <header className="py-[18px]">
            <DesktopNav
              balance={balance}
              changePercent={curveChartData?.changePercent}
              isLoss={curveChartData?.isLoss}
              isLoading={isBalanceLoading || isCurveLoading}
            />
          </header>
          <div className="flex items-start gap-[20px]">
            <main className="flex-1 bg-r-neutral-card-1 rounded-[8px]">
              <ProfileHeader
                balance={balance}
                evmBalance={evmBalance}
                curveChartData={curveChartData}
                isLoading={isBalanceLoading || isCurveLoading}
              />
              <div key={refreshKey}>
                <Tabs
                  activeKey={activeTab}
                  onChange={handleTabChange}
                  tabBarExtraContent={{
                    right: (
                      <div className="flex items-center gap-[16px] pr-[20px]">
                        <UpdateButton
                          isUpdating={isUpdating}
                          onUpdate={handleUpdate}
                          updatedAt={updatedAt}
                        />
                        <DesktopChainSelector
                          value={chain}
                          onChange={(v) =>
                            dispatch.desktopProfile.setField({ chain: v })
                          }
                        />
                      </div>
                    ),
                  }}
                >
                  <Tabs.TabPane tab="Tokens" key="tokens">
                    <TokensTabPane selectChainId={chainInfo?.serverId} />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="NFTs" key="nft">
                    Content of Tab Pane 2
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="Transactions" key="transactions">
                    <TransactionsTabPane />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="Approvals" key="approvals">
                    <div className="px-20 pt-[18px]">
                      <ApprovalManagePage isDesktop={true} />
                    </div>
                  </Tabs.TabPane>
                </Tabs>
              </div>
            </main>
            <aside className="w-[260px] flex-shrink-0">
              <DesktopSelectAccountList
                shouldElevate={shouldElevateAccountList}
                isShowApprovalAlert={true}
              />
            </aside>
          </div>
        </div>
      </Wrap>
      <SendTokenModal
        visible={action === 'send'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
      <SwapTokenModal
        visible={action === 'swap' || action === 'bridge'}
        type={action === 'swap' ? 'swap' : 'bridge'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
    </>
  );
};
