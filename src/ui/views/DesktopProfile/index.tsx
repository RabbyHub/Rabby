import React, { useMemo, useState, useRef, useEffect } from 'react';

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { ProfileHeader } from './components/ProfileHeader';
import { BackTop, Tabs } from 'antd';
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
import { EVENTS, KEYRING_TYPE } from '@/constant';
import { useListenTxReload } from './hooks/useListenTxReload';
import { GnosisQueueModal } from './components/GnosisQueueModal';
import { ApprovalsTabPane } from './components/ApprovalsTabPane';
import { createPortal } from 'react-dom';
import { AddCustomNetworkModal } from './components/AddCustomNetworkModal';
import { AddCustomTokenModal } from './components/AddCustomTokenModal';
import { AddressDetailModal } from './components/AddressDetailModal';
import { AddressBackupModal } from './components/AddressBackupModal';
import { AddAddressModal } from './components/AddAddressModal';
import { RcIconBackTop } from '@/ui/assets/desktop/profile';
import { ReachedEnd } from './components/ReachedEnd';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import TopShortcut, {
  PORTFOLIO_LIST_ID,
  TOP_SHORTCUT_SLOT_ID,
} from './components/TokensTabPane/components/TopShortCut';
import { AbstractProject } from '@/ui/utils/portfolio/types';

const Wrap = styled.div`
  height: 100%;
  width: 100%;
  overflow: auto;
  background: var(--rb-neutral-bg-1, #fff);

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
    font-size: 16px;
    font-weight: 400;
    line-height: 19px;

    padding-top: 16px;
    padding-bottom: 13px;

    &:hover {
      color: var(--r-blue-default, #4c65ff);
    }
  }
  .ant-tabs > .ant-tabs-nav .ant-tabs-nav-wrap {
    padding-left: 20px;
  }
  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--r-blue-default, #4c65ff);
    font-weight: 600;
    text-shadow: none;
  }
  .ant-tabs-top > .ant-tabs-nav .ant-tabs-ink-bar {
    height: 3px;
    border-radius: 2px 2px 0 0;
    background-color: var(--r-blue-default, #4c65ff);
  }
  .ant-tabs-top > .ant-tabs-nav {
    margin-bottom: 0;
  }
  .ant-tabs-top > .ant-tabs-nav::before {
    border-bottom: 1px solid var(--rb-neutral-bg-4, #ebedf0);
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
  const [cacheProjectOverviewList, setCacheProjectOverviewList] = useState<
    AbstractProject[]
  >([]);

  useListenTxReload(async () => {
    if (['tokens', 'transactions'].includes(activeTab)) {
      setRefreshKey((prev) => prev + 1);
    }
    await refreshBalance();
    await refreshCurve();
  });

  useEffect(
    useMemoizedFn(() => {
      if (
        action === 'gnosis-queue' &&
        currentAccount?.type !== KEYRING_TYPE.GnosisKeyring
      ) {
        history.replace(history.location.pathname);
      }
    }),
    [currentAccount?.type]
  );

  return (
    <>
      <Wrap
        className="w-full h-full bg-rb-neutral-bg-1"
        ref={scrollContainerRef}
      >
        <div className="x-container sticky top-0 z-10 pt-[16px] bg-rb-neutral-bg-1">
          <DesktopNav
            balance={balance}
            changePercent={curveChartData?.changePercent}
            isLoss={curveChartData?.isLoss}
            isLoading={isBalanceLoading || isCurveLoading}
          />
          <div
            className="sticky top-[103px] z-10 pt-[16px] overflow-scroll flex-initial"
            style={{ width: 0, scrollbarWidth: 'none' }}
            id={TOP_SHORTCUT_SLOT_ID}
          >
            {cacheProjectOverviewList?.length > 0 && activeTab === 'tokens' && (
              <TopShortcut projects={cacheProjectOverviewList || []} />
            )}
          </div>
        </div>
        <div className="x-container">
          <div className="flex items-start gap-[20px]">
            <main className="flex-1" id={PORTFOLIO_LIST_ID}>
              <div
                className={clsx(
                  'bg-r-neutral-card-1 rounded-[20px]',
                  'border-[1px] border-solid border-rb-neutral-line'
                )}
              >
                <ProfileHeader
                  balance={balance}
                  evmBalance={evmBalance}
                  curveChartData={curveChartData}
                  isLoading={isBalanceLoading || isCurveLoading}
                  onRefresh={handleUpdate}
                />
                <div key={refreshKey}>
                  <Tabs
                    defaultActiveKey={activeTab}
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
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.tokens')}
                      key="tokens"
                    >
                      <TokensTabPane
                        onProjectOverviewListChange={
                          setCacheProjectOverviewList
                        }
                        selectChainId={chainInfo?.serverId}
                      />
                    </Tabs.TabPane>
                    {/* <Tabs.TabPane tab="NFTs" key="nft"></Tabs.TabPane> */}
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.transactions')}
                      key="transactions"
                    >
                      <TransactionsTabPane
                        selectChainId={chainInfo?.serverId}
                        scrollContainerRef={scrollContainerRef}
                      />
                    </Tabs.TabPane>
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.approvals')}
                      key="approvals"
                    >
                      <ApprovalsTabPane
                        isDesktop={true}
                        desktopChain={chain}
                        key={`${currentAccount?.address}-${currentAccount?.type}`}
                      />
                    </Tabs.TabPane>
                  </Tabs>
                </div>
              </div>
              <ReachedEnd />
            </main>
            <aside
              className={clsx(
                'min-w-[260px] flex-shrink-0 overflow-auto sticky top-[103px] z-20'
              )}
            >
              <DesktopSelectAccountList />
            </aside>
          </div>
          <BackTop
            target={() => scrollContainerRef.current || window}
            style={{
              left: '50%',
              bottom: 32,
              transform: 'translateX(700px)',
            }}
          >
            <ThemeIcon src={RcIconBackTop} />
          </BackTop>
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
        action={action as 'swap' | 'bridge'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
      {/* <NftTabModal
        visible={action === 'nft'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      /> */}
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
        destroyOnClose
      />
      <SignatureRecordModal
        visible={action === 'activities'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <GnosisQueueModal
        visible={action === 'gnosis-queue'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />

      <AddressDetailModal
        visible={action === 'address-detail'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <AddressBackupModal
        visible={action === 'address-backup'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
    </>
  );
};
