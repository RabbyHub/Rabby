import React, { useMemo } from 'react';
import styled from 'styled-components';
import { ChartArea } from './components/ChartArea';
import { OrderBookTrades } from './components/OrderBookTrades';
import { TradingPanel } from './components/TradingPanel';
import { UserInfoHistory } from './components/UserInfoHistory';
import { AccountInfo } from './components/AccountInfo';
import { StatusBar } from './components/StatusBar';
import './index.less';
import { usePerpsProInit } from './hooks/usePerpsProInit';
import { useHistory, useLocation } from 'react-router-dom';
import {
  DepositWithdrawModal,
  DepositWithdrawModalType,
} from './components/DepositWithdrawModal';
import { useRabbySelector } from '@/ui/store';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { AccountActions } from './components/AccountActions';
import { TopPermissionTips } from './components/TopPermissionTips';
import { SwitchThemeBtn } from '../DesktopProfile/components/SwitchThemeBtn';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import usePerpsProState from './hooks/usePerpsProState';
import { DesktopDappSelector } from '@/ui/component/DesktopDappSelector';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './resizable-panels.css';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: column;
  padding-bottom: 32px;
`;

export type PopupType = DepositWithdrawModalType | 'add-address' | null;

export const DesktopPerps: React.FC<{ isActive?: boolean }> = ({
  isActive = true,
}) => {
  usePerpsProInit(isActive);

  const history = useHistory();
  const location = useLocation();

  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const { login: switchPerpsAccount } = usePerpsProState();

  const action = useMemo(() => {
    return new URLSearchParams(location.search).get('action');
  }, [location.search]);

  return (
    <>
      <Wrap>
        <div className="flex flex-1 px-[20px] pb-16">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <DesktopNav showRightItems={false} />

              <div className="flex items-center gap-[16px]">
                <DesktopAccountSelector
                  scene="perps"
                  value={currentPerpsAccount}
                  onChange={switchPerpsAccount}
                />
                <AccountActions />
                <SwitchThemeBtn />
              </div>
            </div>
            <TopPermissionTips />
            <div className="flex flex-1 min-w-0 min-h-0 border border-solid border-rb-neutral-line rounded-[16px] overflow-hidden bg-rb-neutral-bg-1">
              {/* [chart + order book] + UserInfoHistory，can be resized vertically */}
              <div className="flex-[4] flex flex-col min-w-0 min-h-0 border-r border-solid border-rb-neutral-line overflow-hidden">
                <PanelGroup
                  direction="vertical"
                  autoSaveId="perps-layout-vertical"
                >
                  <Panel defaultSize={65} minSize={25} maxSize={80}>
                    <div className="flex h-full">
                      <div className="flex-[3] min-w-0 border-r border-solid border-rb-neutral-line">
                        <ChartArea />
                      </div>
                      <div className="flex-1 min-w-0">
                        <OrderBookTrades />
                      </div>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="h-[4px]" />
                  <Panel minSize={20}>
                    <UserInfoHistory />
                  </Panel>
                </PanelGroup>
              </div>

              {/* TradingPanel + AccountInfo */}
              <div className="flex-1 flex-shrink-0 flex flex-col min-h-0 overflow-hidden">
                <div className="h-[680px] flex-shrink-0 overflow-hidden border-b border-solid border-rb-neutral-line">
                  <TradingPanel />
                </div>
                <div className="flex-1 min-h-[366px] overflow-auto">
                  <AccountInfo />
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatusBar />
      </Wrap>
      {/* <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          setPopupType(null);
        }}
        destroyOnClose
      /> */}

      <DepositWithdrawModal
        visible={action === 'deposit' || action === 'withdraw'}
        type={action === 'deposit' ? 'deposit' : 'withdraw'}
        onCancel={() => {
          const searchParams = new URLSearchParams(location.search);
          searchParams.delete('action');
          history.push({
            pathname: location.pathname,
            search: searchParams.toString(),
          });
        }}
      />
    </>
  );
};
