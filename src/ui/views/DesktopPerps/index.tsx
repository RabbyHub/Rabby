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
import { RightAccountBar } from './components/RightAccountBar';
import './resizable-panels.css';
import usePerpsProState from './hooks/usePerpsProState';
import './index.less';

const Wrap = styled.div`
  width: 100%;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  overflow-x: hidden;
  overflow-y: auto;
  flex-direction: column;
`;

export const DesktopPerps: React.FC = () => {
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
    miniSignTypeData,
    clearMiniSignTypeData,
    handleMiniSignResolve,
    handleMiniSignReject,

    handleDeleteAgent,
    perpFee,

    judgeIsUserAgentIsExpired,
  } = usePerpsProState({});

  return (
    <Wrap>
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden px-16 h-[1300px]">
        <div className="flex flex-col flex-1 min-w-0 border border-solid border-rb-neutral-line rounded-[16px] h-[1300px] overflow-hidden">
          {/* <PanelGroup direction="vertical"> */}
          {/* <Panel defaultSize={70} minSize={50} maxSize={80}> */}
          <div className="h-[720px]">
            <div className="h-full border-b border-solid border-rb-neutral-line">
              <PanelGroup direction="horizontal">
                <Panel defaultSize={60} minSize={40} maxSize={80}>
                  <ChartArea />
                </Panel>

                <PanelResizeHandle className="w-[1px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" />

                <Panel defaultSize={20} minSize={15} maxSize={35}>
                  <OrderBookTrades />
                </Panel>

                <PanelResizeHandle className="w-[1px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" />

                <Panel defaultSize={20} minSize={15} maxSize={35}>
                  <TradingPanel />
                </Panel>
              </PanelGroup>
            </div>
          </div>
          {/* </Panel> */}

          {/* <PanelResizeHandle className="h-[0.5px] bg-rb-neutral-line hover:bg-r-blue-default transition-colors" /> */}

          {/* <Panel defaultSize={30} minSize={20} maxSize={50}> */}
          <div className="h-[580px]">
            <div className="h-full flex">
              <UserInfoHistory />
              <AccountInfo />
            </div>
          </div>
          {/* </Panel> */}
          {/* </PanelGroup> */}
        </div>

        <RightAccountBar />
      </div>

      <StatusBar />
    </Wrap>
  );
};
