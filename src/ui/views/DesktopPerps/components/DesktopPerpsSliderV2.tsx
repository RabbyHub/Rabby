import { useThemeMode } from '@/ui/hooks/usePreference';
import { Slider, SliderSingleProps } from 'antd';
import React from 'react';
import styled from 'styled-components';

const StyledSlider = styled(Slider)<{ isDark: boolean }>`
  .ant-slider-rail {
    background-color: ${({ isDark }) =>
      isDark ? 'var(--rb-neutral-bg-2)' : 'var(--r-neutral-line)'};
  }

  &:hover .ant-slider-rail {
    background-color: var(--r-blue-light-2);
  }

  .ant-slider-track,
  &:hover .ant-slider-track {
    background: var(--r-blue-default, #7084ff);
  }

  &:hover > .ant-slider-handle {
    border: none !important;
    box-shadow: none !important;
  }

  .ant-slider-handle {
    margin-top: -10px;
    width: 24px;
    height: 24px;
    background-color: transparent;
    overflow: hidden;
    border: none;
    box-shadow: none;

    &::before,
    &::after {
      position: absolute;
      content: '';
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
    }

    &::before {
      width: 16px;
      height: 16px;
      background-color: white;
      filter: drop-shadow(0px 2px 4px rgba(112, 132, 255, 0.4));
    }

    &::after {
      width: 12px;
      height: 12px;
      background-color: var(--r-blue-default, #7084ff);
    }

    &:hover {
      border: none;
      box-shadow: none;
    }
  }

  .ant-slider-dot {
    width: 8px;
    height: 8px;
    border: 6px solid var(--rb-neutral-line);
    background-color: var(--rb-neutral-line);
    top: -4px;
  }

  .ant-slider-dot-active {
    border-color: var(--r-blue-default, #7084ff);
  }

  &:hover .ant-slider-dot {
    border-color: var(--r-blue-light-2);
  }

  &:hover .ant-slider-dot-active {
    border-color: var(--r-blue-default, #7084ff);
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
      onMouseMove={(e) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <StyledSlider
        {...sliderProps}
        tooltipVisible={tooltipVisible}
        tooltipPrefixCls={showTooltip ? 'perps-slider-tip' : undefined}
        isDark={isDarkTheme}
        onAfterChange={handleAfterChange}
        onChange={(value) => {
          setDragging(true);
          sliderProps.onChange?.(value);
        }}
      />
    </div>
  );
};
