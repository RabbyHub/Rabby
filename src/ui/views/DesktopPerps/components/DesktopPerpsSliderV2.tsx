import { useThemeMode } from '@/ui/hooks/usePreference';
import { Slider, SliderSingleProps } from 'antd';
import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/ui/utils/cn';
import styles from './DesktopPerpsSliderV2.module.css';

export const DesktopPerpsSliderV2 = (
  props: SliderSingleProps & { showTooltip?: boolean }
) => {
  const { isDarkTheme } = useThemeMode();
  const { showTooltip, ...sliderProps } = props;
  const { onAfterChange } = sliderProps;
  const [hovered, setHovered] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const tooltipVisible = showTooltip ? hovered || dragging : false;

  const handleAfterChange = React.useCallback(
    (value: number) => {
      setDragging(false);
      // Check if mouse is still inside the wrapper
      const el = wrapperRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const isInside =
          lastMousePos.current.x >= rect.left &&
          lastMousePos.current.x <= rect.right &&
          lastMousePos.current.y >= rect.top &&
          lastMousePos.current.y <= rect.bottom;
        if (!isInside) {
          setHovered(false);
        }
      }
      onAfterChange?.(value);
    },
    [onAfterChange]
  );

  const lastMousePos = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!dragging) return;
    // Kill text selection across the whole page during the drag, so a fast
    // drag doesn't extend the browser's selection range into other modules
    // (the "selected"/highlighted state on the order panel's labels, etc.).
    document.body.style.userSelect = 'none';
    const onMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      setDragging(false);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!dragging) setHovered(false);
      }}
      onMouseDown={() => {
        // Set synchronously (before any mousemove) so the selection never
        // starts; the effect below restores it on mouseup.
        document.body.style.userSelect = 'none';
        setDragging(true);
      }}
      onMouseMove={(e) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <Slider
        {...sliderProps}
        className={cn(
          styles.slider,
          isDarkTheme && styles.dark,
          sliderProps.className
        )}
        tooltip={{
          open: tooltipVisible,
          prefixCls: showTooltip ? 'perps-slider-tip' : undefined,
        }}
        onAfterChange={handleAfterChange}
        onChange={(value) => {
          setDragging(true);
          sliderProps.onChange?.(value);
        }}
      />
      {/* While dragging, a full-viewport overlay catches the cursor so fast
          drags don't fire hover/mouse events on other modules (orderbook,
          trades, etc.). rc-slider listens on `document`, and these events
          bubble overlay → document, so the drag itself keeps working. */}
      {dragging &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          />,
          document.body
        )}
    </div>
  );
};
