/**
 * Widget container — owns position, drag, and the ball ↔ panel expansion state.
 * Ball is just header content; Panel is just body content. The container CSS
 * morphs between collapsed and expanded forms.
 */

import React from 'react';
import { livedataClient } from '../livedataClient';
import { PerpsLiveSnapshot } from '@/utils/message/perpsLive';
import { Ball } from './Ball';
import { Panel } from './Panel';
import { truncateAddress } from './format';
import { saveBallPosition, loadBallPosition } from './wallet';

const COLLAPSED_WIDTH = 130;
const COLLAPSED_HEIGHT = 32;
const HIDE_PANEL_DELAY_MS = 200;
/** Movement under this many px is treated as click/hover, not drag */
const DRAG_INTENT_THRESHOLD_PX = 5;
/** Gap kept between the docked ball and the top/bottom viewport edges */
const EDGE_SAFE_MARGIN_PX = 12;

function computeDefaultY(): number {
  return Math.max(0, window.innerHeight - 80);
}

function clampY(y: number): number {
  return Math.max(
    EDGE_SAFE_MARGIN_PX,
    Math.min(y, window.innerHeight - COLLAPSED_HEIGHT - EDGE_SAFE_MARGIN_PX)
  );
}

function dockSideFor(x: number): 'left' | 'right' {
  const center = x + COLLAPSED_WIDTH / 2;
  return center < window.innerWidth / 2 ? 'left' : 'right';
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  /** 'maybe' until cursor crosses DRAG_INTENT_THRESHOLD_PX, then 'drag' */
  intent: 'maybe' | 'drag';
}

export const App: React.FC = () => {
  const [snapshot, setSnapshot] = React.useState<PerpsLiveSnapshot | null>(
    livedataClient.getLatest()
  );
  const [pos, setPos] = React.useState<{ x: number; y: number }>(() => ({
    x: window.innerWidth - COLLAPSED_WIDTH,
    y: computeDefaultY(),
  }));
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const hidePanelTimer = React.useRef<number | null>(null);
  const dragStateRef = React.useRef<DragState | null>(null);

  React.useEffect(() => {
    const unsubSnap = livedataClient.subscribe(setSnapshot);
    return () => {
      unsubSnap();
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    loadBallPosition()
      .then((p) => {
        if (cancelled || !p) return;
        setPos({ x: p.x, y: clampY(p.y) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const onResize = (): void =>
      setPos((prev) => ({ x: prev.x, y: clampY(prev.y) }));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    // A hidden tab (e.g. a card click opened the Pro tab) fires no mouseleave, so
    // collapse the panel here instead of leaving it stuck open.
    const onVisibility = (): void => {
      if (document.hidden) setIsExpanded(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const clearHideTimer = (): void => {
    if (hidePanelTimer.current != null) {
      window.clearTimeout(hidePanelTimer.current);
      hidePanelTimer.current = null;
    }
  };
  const scheduleHide = (): void => {
    clearHideTimer();
    hidePanelTimer.current = window.setTimeout(() => {
      setIsExpanded(false);
      hidePanelTimer.current = null;
    }, HIDE_PANEL_DELAY_MS);
  };

  const handleEnter = (): void => {
    if (isDragging) return;
    clearHideTimer();
    setIsExpanded(true);
  };
  const handleLeave = (): void => {
    if (isDragging) return;
    scheduleHide();
  };

  React.useEffect(() => () => clearHideTimer(), []);

  // Threshold-gated drag so a hover-and-click doesn't accidentally pick up the widget.
  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return;
    // keeps the grab point aligned with the cursor
    const rect = e.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: e.clientX - COLLAPSED_WIDTH / 2,
      origY: rect.top,
      intent: 'maybe',
    };

    const onMove = (ev: PointerEvent): void => {
      const s = dragStateRef.current;
      if (!s) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      if (s.intent === 'maybe') {
        if (
          Math.abs(dx) < DRAG_INTENT_THRESHOLD_PX &&
          Math.abs(dy) < DRAG_INTENT_THRESHOLD_PX
        ) {
          return;
        }
        s.intent = 'drag';
        setIsDragging(true);
        setIsExpanded(false);
        clearHideTimer();
      }
      // Track the cursor 1:1 while dragging (no clamp) so the ball never lags
      // behind the pointer at the screen edges; clamp + dock happen on release.
      setPos({ x: s.origX + dx, y: s.origY + dy });
    };

    const onUp = (): void => {
      const s = dragStateRef.current;
      if (!s) return;
      if (s.intent === 'drag') {
        setIsDragging(false);
        setPos((prev) => {
          const side = dockSideFor(prev.x);
          // Dock x to the nearest edge; clamp y back into the viewport now that
          // dragging tracked the cursor freely. This docked position is persisted.
          const snapped = {
            x: side === 'left' ? 0 : window.innerWidth - COLLAPSED_WIDTH,
            y: clampY(prev.y),
          };
          saveBallPosition(snapped).catch(() => {});
          return snapped;
        });
      }
      dragStateRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const hasPositions = !!snapshot && snapshot.positions.length > 0;
  if (!hasPositions) return null;

  const side = dockSideFor(pos.x);
  // Bottom-half ball → bottom-anchor so the panel grows upward (off-screen otherwise).
  // Layout order is unchanged: header stays on top, panel below.
  const flipUp =
    !isDragging && pos.y + COLLAPSED_HEIGHT > window.innerHeight / 2;
  const sideAnchor = side === 'left' ? { left: 0 } : { right: 0 };
  const containerStyle: React.CSSProperties = isDragging
    ? { left: `${pos.x}px`, top: `${pos.y}px` }
    : flipUp
    ? {
        ...sideAnchor,
        bottom: `${Math.max(
          0,
          window.innerHeight - pos.y - COLLAPSED_HEIGHT
        )}px`,
      }
    : { ...sideAnchor, top: `${pos.y}px` };

  const className = [
    'rabby-perps-widget',
    isExpanded && !isDragging ? 'expanded' : '',
    isDragging ? 'dragging' : `dock-${side}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={containerStyle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      role="dialog"
    >
      {/* Drag is bound to the header only, so the expanded panel body isn't a drag target */}
      <div
        className="rabby-perps-widget__header"
        onPointerDown={handlePointerDown}
      >
        <div className="rabby-perps-widget__header-left">
          <Ball totalPnl={snapshot!.totalUnrealizedPnl} />
        </div>
        <span className="rabby-perps-widget__address">
          {truncateAddress(snapshot!.address)}
        </span>
      </div>
      <Panel snapshot={snapshot} />
    </div>
  );
};
