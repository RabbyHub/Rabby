import React from 'react';
import styled from 'styled-components';
import { ChartArea } from './components/ChartArea';
import { OrderBookTrades } from './components/OrderBookTrades';
import { TradingPanel } from './components/TradingPanel';
import { UserInfoHistory } from './components/UserInfoHistory';
import { AccountInfo } from './components/AccountInfo';
import { StatusBar } from './components/StatusBar';
import { DesktopPerpsTopBar } from './components/DesktopPerpsTopBar';
import './index.less';
import { usePerpsProInit } from './hooks/usePerpsProInit';
import {
  DepositWithdrawModal,
  DepositWithdrawModalType,
} from './components/DepositWithdrawModal';
import { SpotSwapModal } from './modal/SpotSwapModal';
import { EnableUnifiedAccountModal } from './modal/EnableUnifiedAccountModal';
import { TransferToPerpsModal } from './modal/TransferToPerpsModal';
import { usePerpsPopupNav } from './hooks/usePerpsPopupNav';
import { usePerpsActions } from '@/ui/views/Perps/hooks/usePerpsActions';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './resizable-panels.css';
import { useMount } from 'ahooks';
import { reportWebPageView } from '@/ui/utils/ga-event';
import { useLocation } from 'react-router-dom';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-page, #f6f7f7);
  display: flex;
  flex-direction: column;
`;

export type PopupType =
  | DepositWithdrawModalType
  | 'swap'
  | 'enable-unified'
  | 'transfer-to-perps'
  | 'add-address'
  | null;

export const DesktopPerps: React.FC<{ isActive?: boolean }> = ({
  isActive = true,
}) => {
  usePerpsProInit(isActive);

  const {
    action,
    source,
    target,
    disableSwitch,
    next,
    isActionOpen,
    getActionZIndex,
    closePerpsPopup,
    advancePerpsPopup,
    openPerpsPopup,
  } = usePerpsPopupNav();
  const { handleEnableUnifiedAccount } = usePerpsActions();

  const location = useLocation();
  useMount(() => {
    reportWebPageView(location.pathname);
  });

  return (
    <>
      <Wrap>
        <DesktopPerpsTopBar />

        <div className="flex flex-1 min-h-0 overflow-x-auto px-[6px] pt-[6px] pb-[44px]">
          <div className="flex flex-1 min-w-[1180px] min-h-0 gap-[6px]">
            {/* [chart + order book] + UserInfoHistory, can be resized vertically */}
            <div
              className="flex flex-col min-w-0 min-h-0 overflow-hidden"
              // Left rail is 80%; inside it chart/order book split 77.5/22.5,
              // preserving chart : order book : actions = 62% : 18% : 20%.
              style={{ flex: '1 1 80%' }}
            >
              <PanelGroup
                direction="vertical"
                autoSaveId="perps-layout-vertical-v2"
              >
                <Panel defaultSize={74.2} minSize={35} maxSize={82}>
                  <div className="flex h-full gap-[6px]">
                    <div
                      className="min-w-[560px] min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                      style={{ flex: '1 1 77.5%' }}
                    >
                      <ChartArea />
                    </div>
                    <div
                      className="min-w-[280px] min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                      style={{ flex: '0 0 22.5%' }}
                    >
                      <OrderBookTrades />
                    </div>
                  </div>
                </Panel>
                <PanelResizeHandle className="h-[2px] rounded-[6px]" />
                <Panel minSize={18}>
                  <div className="h-full rounded-[6px] overflow-hidden bg-rb-neutral-bg-1">
                    <UserInfoHistory />
                  </div>
                </Panel>
              </PanelGroup>
            </div>

            {/* TradingPanel + AccountInfo */}
            <div
              className="min-w-[340px] shrink-0 min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
              style={{ flex: '0 0 20%' }}
            >
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex-1 min-h-0">
                  <TradingPanel />
                </div>
                <div className="mx-[12px] h-[1px] shrink-0 bg-rb-neutral-line" />
                <AccountInfo />
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
        visible={isActionOpen('deposit') || isActionOpen('withdraw')}
        type={action === 'withdraw' ? 'withdraw' : 'deposit'}
        zIndex={getActionZIndex('deposit') ?? getActionZIndex('withdraw')}
        onCancel={closePerpsPopup}
      />

      <SpotSwapModal
        visible={isActionOpen('swap')}
        zIndex={getActionZIndex('swap')}
        sourceAsset={source}
        targetAsset={target}
        disableSwitch={disableSwitch}
        onDeposit={() => {
          openPerpsPopup('deposit');
        }}
        onClose={closePerpsPopup}
      />

      <EnableUnifiedAccountModal
        visible={isActionOpen('enable-unified')}
        zIndex={getActionZIndex('enable-unified')}
        onCancel={closePerpsPopup}
        onConfirm={async () => {
          const ok = await handleEnableUnifiedAccount();
          if (ok && next) {
            // We took over the close path by advancing to the chained popup.
            // Return false so the modal skips its own onCancel call, which
            // would otherwise wipe the freshly pushed URL params.
            advancePerpsPopup();
            return false;
          }
          return ok;
        }}
      />

      <TransferToPerpsModal
        visible={isActionOpen('transfer-to-perps')}
        zIndex={getActionZIndex('transfer-to-perps')}
        onClose={closePerpsPopup}
      />
    </>
  );
};
