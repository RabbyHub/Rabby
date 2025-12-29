import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TopNavBar } from './components/TopNavBar';
import { ChartArea } from './components/ChartArea';
import { OrderBookTrades } from './components/OrderBookTrades';
import { TradingPanel } from './components/TradingPanel';
import { UserInfoHistory } from './components/UserInfoHistory';
import { AccountInfo } from './components/AccountInfo';
import { StatusBar } from './components/StatusBar';
import './resizable-panels.css';
import usePerpsProState from './hooks/usePerpsProState';
import './index.less';
import { usePerpsDefaultAccount } from '../Perps/hooks/usePerpsDefaultAccount';
import { DesktopPerpsSelectAccountList } from '@/ui/component/DesktopSelectAccountList/PerpsAccountList';
import clsx from 'clsx';

const Wrap = styled.div`
  width: 100%;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  overflow-x: hidden;
  overflow-y: auto;
  flex-direction: column;
`;

export const DesktopPerps: React.FC = () => {
  usePerpsDefaultAccount({
    isPro: true,
  });
  const {
    positionAndOpenOrders,
    accountSummary,
    currentPerpsAccount,
    isLogin,
    marketData,
    userFills,
    marketDataMap,
    isInitialized,
    logout,
    login,
    handleWithdraw,
    homeHistoryList,
    hasPermission,
    localLoadingHistory,

    handleDeleteAgent,
    perpFee,

    judgeIsUserAgentIsExpired,
  } = usePerpsProState({});

  return (
    <Wrap>
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden px-16 h-[1400px]">
        <div className="flex flex-col flex-1 min-w-0 border border-solid border-rb-neutral-line rounded-[16px] h-[1300px] overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* 左侧列 */}
            <Panel defaultSize={80} minSize={50} maxSize={85}>
              <PanelGroup direction="vertical">
                {/* 上半部分：ChartArea 和 OrderBookTrades */}
                <Panel defaultSize={56} minSize={40} maxSize={70}>
                  <div className="h-full border-b border-solid border-rb-neutral-line">
                    <PanelGroup direction="horizontal">
                      <Panel defaultSize={75} minSize={60} maxSize={85}>
                        <ChartArea />
                      </Panel>

                      <PanelResizeHandle className="w-[1px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" />

                      <Panel defaultSize={25} minSize={15} maxSize={40}>
                        <OrderBookTrades />
                      </Panel>
                    </PanelGroup>
                  </div>
                </Panel>

                {/* <PanelResizeHandle className="h-[1px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" /> */}

                {/* 下半部分：UserInfoHistory */}
                <Panel defaultSize={44} minSize={30} maxSize={60}>
                  <div className="h-full">
                    <UserInfoHistory />
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>

            {/* <PanelResizeHandle className="w-[1px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" /> */}

            {/* 右侧列 */}
            <Panel defaultSize={20} minSize={15} maxSize={50}>
              <PanelGroup direction="vertical">
                {/* 上半部分：TradingPanel */}
                <Panel defaultSize={56} minSize={40} maxSize={70}>
                  <div className="h-full border-b border-solid border-rb-neutral-line">
                    <TradingPanel />
                  </div>
                </Panel>

                {/* <PanelResizeHandle className="h-[1px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" /> */}

                {/* 下半部分：AccountInfo */}
                <Panel defaultSize={44} minSize={30} maxSize={60}>
                  <div className="h-full">
                    <AccountInfo />
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>

        {/* <RightAccountBar /> */}
        <aside
          className={clsx(
            'min-w-[64px] flex-shrink-0 z-20 h-full overflow-auto px-[16px]'
          )}
        >
          <DesktopPerpsSelectAccountList
            currentAccount={currentPerpsAccount}
            switchPerpsAccount={login}
          />
        </aside>
      </div>

      <StatusBar />
    </Wrap>
  );
};
