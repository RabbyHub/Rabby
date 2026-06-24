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
  /* Definite height, not min-height: min-height computes to auto (indefinite),
     which breaks h-full resolution on the right rail and lets TradingPanel's
     content push the whole row taller. */
  height: 100vh;
  overflow: hidden;
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
          {/* Floor so panels aren't crushed on short viewports; 810 lets the
              dominant 1080p fit without a page scroll (this runs as a browser tab
              that loses ~160px of height to chrome). Below it the outer row
              scrolls while the top bar and fixed status bar stay pinned. */}
          <div className="flex flex-1 min-w-[1280px] min-h-[810px] gap-[6px]">
            {/* [chart + order book] + UserInfoHistory, can be resized vertically */}
            <div
              className="flex flex-col min-w-0 min-h-0 overflow-hidden"
              // Left rail fills the space left by the trade panel. Inside it the
              // order book is clamp(260px, 18vw, 320px) and the chart takes the
              // rest, keeping ~chart : order book : panel = 62% : 18% : 20%.
              style={{ flex: '1 1 0%' }}
            >
              <PanelGroup
                direction="vertical"
                autoSaveId="perps-layout-vertical-v2"
              >
                <Panel defaultSize={74.2} minSize={35} maxSize={82}>
                  <div className="flex h-full gap-[6px]">
                    <div
                      className="min-w-[560px] min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                      style={{ flex: '1 1 0%' }}
                    >
                      <ChartArea />
                    </div>
                    <div
                      className="min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                      style={{
                        flexGrow: 0,
                        flexShrink: 0,
                        flexBasis: 'clamp(260px, 18vw, 320px)',
                      }}
                    >
                      <OrderBookTrades />
                    </div>
                  </div>
                </Panel>
                <PanelResizeHandle className="h-[6px] rounded-[6px]" />
                <Panel minSize={18}>
                  <div className="h-full rounded-[6px] overflow-hidden bg-rb-neutral-bg-1">
                    <UserInfoHistory />
                  </div>
                </Panel>
              </PanelGroup>
            </div>

            {/* Two boxes split by a 6px gap (no drag handle). TradingPanel takes
                the remaining height (scrolls internally); AccountInfo sizes to its
                own content so the summary is always fully shown (no clip / no dead
                space) and adapts across account types (e.g. PM has one extra row). */}
            <div
              className="flex flex-col min-h-0 overflow-hidden gap-[6px]"
              style={{
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: 'clamp(276px, 20vw, 336px)',
              }}
            >
              <div
                className="min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                style={{ flex: '1 1 0%' }}
              >
                <TradingPanel />
              </div>
              <div
                className="shrink-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                style={{ flex: '0 0 auto' }}
              >
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
