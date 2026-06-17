import { useThemeMode } from '@/ui/hooks/usePreference';
import { Slider, SliderSingleProps } from 'antd';
import React from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

const StyledSlider = styled(Slider)<{ isDark: boolean }>`
  margin-top: 6px;
  margin-bottom: 6px;

  .ant-slider-rail,
  &:hover .ant-slider-rail {
    height: 2px;
    background-color: ${({ isDark }) =>
      isDark ? 'var(--rb-neutral-bg-2)' : 'var(--r-neutral-line)'};
  }

  .ant-slider-track,
  &:hover .ant-slider-track {
    height: 2px;
    background: var(--r-blue-default, #7084ff);
  }

  &:hover > .ant-slider-handle {
    border: none !important;
    box-shadow: none !important;
  }

  .ant-slider-handle {
    margin-top: -12px;
    width: 24px;
    height: 24px;
    background-color: transparent;
    border: none;
    box-shadow: none;

    &::before {
      display: none;
    }

    &::after {
      position: absolute;
      content: '';
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      width: 12px;
      height: 12px;
      background-color: var(--rb-brand-default, #7084ff);
      border: 1.3px solid var(--r-neutral-body, #d3d8e0);
      box-shadow: 0px 2px 4px rgba(112, 132, 255, 0.4);
    }

    &:hover {
      border: none;
      box-shadow: none;
    }
  }

  /* Inactive marks (right of handle): 9px, bg-4 fill + line ring */
  .ant-slider-dot,
  &:hover .ant-slider-dot {
    width: 9px;
    height: 9px;
    border: 1px solid var(--rb-neutral-line, #2f3135);
    background-color: var(--rb-neutral-bg-4, #383b41);
    top: -4px;
  }

  /* Active marks (passed, left of handle): 9px, brand fill + neutral-body ring */
  .ant-slider-dot-active,
  &:hover .ant-slider-dot-active {
    border-color: var(--r-neutral-body, #d3d8e0);
    background-color: var(--rb-brand-default, #7084ff);
  }
`;

export const DesktopPerpsSliderV2 = (
  props: SliderSingleProps & { showTooltip?: boolean }
) => {
  const { isDarkTheme } = useThemeMode();
  const { showTooltip, ...sliderProps } = props;
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
      sliderProps.onAfterChange?.(value);
    },
    [sliderProps.onAfterChange]
  );

  const lastMousePos = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      setDragging(false);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
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
      onMouseDown={() => setDragging(true)}
      onMouseMove={(e) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <StyledSlider
        {...sliderProps}
        tooltip={{
          open: tooltipVisible,
          prefixCls: showTooltip ? 'perps-slider-tip' : undefined,
        }}
        isDark={isDarkTheme}
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
