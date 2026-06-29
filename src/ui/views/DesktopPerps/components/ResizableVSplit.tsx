import React from 'react';
import styled from 'styled-components';

const HANDLE_HEIGHT = 6;
// Drag starts only past this threshold (px) so a click — with its few px of
// jitter — never nudges the layout and the blocks stay aligned.
const DRAG_THRESHOLD = 3;

const VResizeHandle = styled.div`
  position: relative;
  flex-shrink: 0;
  height: ${HANDLE_HEIGHT}px;
  border-radius: 6px;
  cursor: row-resize;
  /* Stops touch drags from scrolling the page instead of resizing. */
  touch-action: none;
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

const readStoredHeight = (key: string, fallback: number) => {
  const raw = Number(localStorage.getItem(key));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

export interface ResizableVSplitProps {
  storageKey: string;
  defaultTopHeight: number;
  minTopRatio?: number;
  maxTopRatio?: number;
  // Must lay its children out as a flex column.
  className?: string;
  style?: React.CSSProperties;
  topClassName?: string;
  bottomClassName?: string;
  top: React.ReactNode;
  bottom: React.ReactNode;
}

export const ResizableVSplit: React.FC<ResizableVSplitProps> = ({
  storageKey,
  defaultTopHeight,
  minTopRatio = 0.35,
  maxTopRatio = 0.82,
  className,
  style,
  topClassName,
  bottomClassName,
  top,
  bottom,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const topBlockRef = React.useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = React.useState(() =>
    readStoredHeight(storageKey, defaultTopHeight)
  );
  const topHeightRef = React.useRef(topHeight);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleResizeStart = React.useCallback(
    (e: React.PointerEvent) => {
      // Only the left button drags.
      if (e.button !== 0) return;
      e.preventDefault();
      const startY = e.clientY;
      const startH = topHeightRef.current;
      let dragging = false;

      const beginDrag = () => {
        dragging = true;
        setIsDragging(true);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'row-resize';
      };

      const endDrag = () => {
        setIsDragging(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };

      const onMove = (ev: PointerEvent) => {
        // Released without a pointerup reaching us (e.g. over an iframe / outside
        // the window); self-heal so the drag can't stick.
        if (ev.buttons === 0) {
          onUp();
          return;
        }
        if (!dragging) {
          // Still a click, not a drag yet — don't touch the layout.
          if (Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return;
          beginDrag();
        }
        const containerHeight = containerRef.current?.clientHeight ?? 0;
        let next = startH + (ev.clientY - startY);
        if (containerHeight > 0) {
          const minH = containerHeight * minTopRatio;
          const maxH = containerHeight * maxTopRatio - HANDLE_HEIGHT;
          next = Math.min(Math.max(next, minH), maxH);
        }
        next = Math.round(next);
        topHeightRef.current = next;
        // Mutate the DOM directly so the drag stays smooth; commit to React state
        // once, on pointer up.
        if (topBlockRef.current) {
          topBlockRef.current.style.height = `${next}px`;
        }
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        // A click (never crossed the threshold) — leave layout and storage as-is.
        if (!dragging) return;
        endDrag();
        setTopHeight(topHeightRef.current);
        localStorage.setItem(storageKey, String(topHeightRef.current));
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      // pointercancel (touch interrupt / lost capture) won't fire pointerup;
      // reuse onUp so the drag still tears down.
      document.addEventListener('pointercancel', onUp);
    },
    [minTopRatio, maxTopRatio, storageKey]
  );

  return (
    <div ref={containerRef} className={className} style={style}>
      <div
        ref={topBlockRef}
        className={topClassName}
        // pointer-events:none while dragging lets the pointer pass through the
        // chart's cross-origin iframe to the document; otherwise the iframe
        // swallows pointermove and the drag freezes over the chart.
        style={{
          height: topHeight,
          flexShrink: 0,
          pointerEvents: isDragging ? 'none' : undefined,
        }}
      >
        {top}
      </div>
      <VResizeHandle
        className={isDragging ? 'dragging' : undefined}
        onPointerDown={handleResizeStart}
      />
      <div
        className={bottomClassName}
        style={{ pointerEvents: isDragging ? 'none' : undefined }}
      >
        {bottom}
      </div>
    </div>
  );
};
