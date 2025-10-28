import React, { useMemo, useState, useRef, useEffect } from 'react';

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
import { useDocumentVisibility, useMemoizedFn } from 'ahooks';
import { NftTabModal } from './components/NftTabModal';
import { SendNftModal } from './components/SendNftModal';
import { ReceiveTokenModal } from './components/ReceiveTokenModal';
import { SignatureRecordModal } from './components/SignatureRecordModal';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { useListenTxReload } from './hooks/useListenTxReload';

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

    &:hover {
      color: var(--r-blue-default, #4c65ff);
    }
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
    if (key === 'nft') {
      history.replace(`/desktop/profile?action=${key}`);
      return;
    }
    history.replace(`/desktop/profile/${key}`);
  };
  const location = useLocation();
  const action = new URLSearchParams(location.search).get('action');
  const chain = useRabbySelector((store) => store.desktopProfile.chain);
  const dispatch = useRabbyDispatch();
  const chainInfo = useMemo(() => findChainByEnum(chain), [chain]);
  const shouldElevateAccountList =
    action === 'send' || action === 'swap' || action === 'bridge';

  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isUpdating) {
      // todo
      setUpdatedAt(Date.now());
    }
  }, [isUpdating]);

  const handleUpdate = useMemoizedFn(async () => {
    setRefreshKey((prev) => prev + 1);
    await refreshBalance();
    await refreshCurve();
  });

  useListenTxReload(async () => {
    if (activeTab === 'tokens') {
      setRefreshKey((prev) => prev + 1);
    }
    await refreshBalance();
    await refreshCurve();
  });

  return (
    <>
      <Wrap className="w-full h-full bg-r-neutral-bg2" ref={scrollContainerRef}>
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
                  <Tabs.TabPane tab="NFTs" key="nft"></Tabs.TabPane>
                  <Tabs.TabPane tab="Transactions" key="transactions">
                    <TransactionsTabPane
                      selectChainId={chainInfo?.serverId}
                      scrollContainerRef={scrollContainerRef}
                    />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="Approvals" key="approvals">
                    <ApprovalManagePage
                      isDesktop={true}
                      desktopChain={chain}
                      key={`${currentAccount?.address}-${currentAccount?.type}`}
                    />
                  </Tabs.TabPane>
                </Tabs>
              </div>
            </main>
            <aside
              className="w-[260px] flex-shrink-0 overflow-auto"
              style={{
                height: 'calc(100vh - 120px)',
              }}
            >
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
      <NftTabModal
        visible={action === 'nft'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <SendNftModal
        visible={action === 'send-nft'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <ReceiveTokenModal
        visible={action === 'receive'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
      <SignatureRecordModal
        visible={action === 'activities'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
    </>
  );
};
