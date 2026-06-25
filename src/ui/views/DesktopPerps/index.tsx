import React, { useLayoutEffect } from 'react';
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

// Fixed so TradingPanel's bottom edge lines up with the left top block.
const RIGHT_PANEL_HEIGHT = 663;

// Persisted in px (not %) so a resize only stretches the bottom, never the top;
// new key drops the stale percentage data.
const TOP_HEIGHT_KEY = 'perps-layout-top-height-v1';
const DEFAULT_TOP_HEIGHT = RIGHT_PANEL_HEIGHT;
// Previous drag limits: top 35%–82% of the rail (keeps the bottom ≥ 18%).
const MIN_TOP_RATIO = 0.35;
const MAX_TOP_RATIO = 0.82;
const HANDLE_HEIGHT = 6;

const readStoredTopHeight = () => {
  const raw = Number(localStorage.getItem(TOP_HEIGHT_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TOP_HEIGHT;
};

// Mirrors the old react-resizable-panels handle look (consistency).
const VResizeHandle = styled.div`
  position: relative;
  flex-shrink: 0;
  height: ${HANDLE_HEIGHT}px;
  border-radius: 6px;
  cursor: row-resize;
  background-color: var(--rb-neutral-bg-page, #f6f7f7);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
    border-radius: 6px;
    background-color: transparent;
    transition: background-color 0.2s ease;
  }

  &:hover::after,
  &.dragging::after {
    background-color: var(--rb-neutral-info, #c5c5cf);
  }
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

  // The Perps pro page (its own desktop tab) uses 350 as its regular weight.
  // Tagging the document body lets the single default rule cascade everywhere —
  // including portaled modals / tooltips / toasts — so individual elements can
  // just inherit instead of hardcoding the regular weight.
  useLayoutEffect(() => {
    document.body.classList.add('perps-pro-page');
    return () => {
      document.body.classList.remove('perps-pro-page');
    };
  }, []);

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

  // Top block keeps a fixed px height; the bottom block flexes, so window
  // resizes only stretch the bottom.
  const leftRailRef = React.useRef<HTMLDivElement>(null);
  const topBlockRef = React.useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = React.useState(readStoredTopHeight);
  const topHeightRef = React.useRef(topHeight);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleResizeStart = React.useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = topHeightRef.current;
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    const onMove = (ev: PointerEvent) => {
      const railHeight = leftRailRef.current?.clientHeight ?? 0;
      let next = startH + (ev.clientY - startY);
      if (railHeight > 0) {
        const minH = railHeight * MIN_TOP_RATIO;
        const maxH = railHeight * MAX_TOP_RATIO - HANDLE_HEIGHT;
        next = Math.min(Math.max(next, minH), maxH);
      }
      next = Math.round(next);
      topHeightRef.current = next;
      // Mutate the DOM directly (no per-move React re-render) to keep the drag
      // smooth; React state is committed once, on pointer up.
      if (topBlockRef.current) {
        topBlockRef.current.style.height = `${next}px`;
      }
    };

    const onUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setTopHeight(topHeightRef.current);
      localStorage.setItem(TOP_HEIGHT_KEY, String(topHeightRef.current));
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, []);

  return (
    <>
      <Wrap>
        {/* Fixed top bar — mirrors the fixed StatusBar at the bottom (sticky;
            content scrolls underneath). bg-page masks content behind the card.
            Its 50px footprint (6 + 38 + 6 gap) is reserved by the row's pt below. */}
        <div className="fixed top-0 left-0 right-0 z-30 bg-rb-neutral-bg-page">
          <DesktopPerpsTopBar />
        </div>

        <div className="flex flex-1 min-h-0 overflow-auto px-[6px] pt-[50px] pb-[44px]">
          {/* Sized to fully fit the right rail (636 + gap + AccountInfo ≈300, PM
              4-row) so shorter viewports scroll (overflow-auto) instead of
              clipping the bottom. */}
          <div className="flex flex-1 min-w-[1280px] min-h-[950px] gap-[6px]">
            {/* [chart + order book] + UserInfoHistory, can be resized vertically */}
            <div
              ref={leftRailRef}
              className="flex flex-col min-w-0 min-h-0 overflow-hidden"
              // Left rail fills the space left by the trade panel. Inside it the
              // order book is clamp(260px, 18vw, 320px) and the chart takes the
              // rest, keeping ~chart : order book : panel = 62% : 18% : 20%.
              style={{ flex: '1 1 0%' }}
            >
              {/* Fixed px height — window resizes flex only the bottom, not this. */}
              <div
                ref={topBlockRef}
                className="flex gap-[6px] min-h-0"
                style={{ height: topHeight, flexShrink: 0 }}
              >
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
              <VResizeHandle
                className={isDragging ? 'dragging' : undefined}
                onPointerDown={handleResizeStart}
              />
              <div className="flex-1 min-h-0 rounded-[6px] overflow-hidden bg-rb-neutral-bg-1">
                <UserInfoHistory />
              </div>
            </div>

            {/* TradingPanel fixed (aligns with the left top block). AccountInfo
                grows to fill the bottom but never shrinks below its content, so
                the summary stays fully shown. */}
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
                style={{ flex: `0 0 ${RIGHT_PANEL_HEIGHT}px` }}
              >
                <TradingPanel />
              </div>
              <div
                className="rounded-[6px] overflow-hidden bg-rb-neutral-bg-1"
                style={{ flex: '1 0 auto' }}
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
