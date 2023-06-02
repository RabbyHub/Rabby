import { Tooltip as AntdTooltip, TooltipProps } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';

const TooltipWrap = React.forwardRef<
  any,
  TooltipProps & {
    left: number;
  }
>(({ className, ...rest }, ref) => {
  return (
    <AntdTooltip
      ref={ref}
      {...(rest as TooltipProps)}
      overlayClassName={clsx(className, rest.overlayClassName)}
    />
  );
});

const TooltipWrapStyled = styled(TooltipWrap)`
  .ant-tooltip-arrow {
    ${({ left }) => left && `left: calc(${left}px)`}
  }
`;

/**
 * FIXME: the bug is fixed in antd 5.x, so we can remove this component after upgrade
 * see https://ant.design/docs/blog/tooltip-align
 *
 * Tooltip with magnet arrow
 * 1. auto align tooltip arrow to the middle of the trigger element
 * 2. attach tooltip to the trigger element's parent
 * 3. only support bottom or top placement
 */
export const TooltipWithMagnetArrow = React.forwardRef<any, TooltipProps>(
  (props, ref) => {
    const [left, setLeft] = React.useState(0);

    const getPopupContainer = (trigger) => {
      const triggerRect = trigger.getBoundingClientRect() ?? {};
      const parentRect = trigger.parentElement.getBoundingClientRect() ?? {};
      let offsetLeft = 0;

      if (triggerRect) {
        offsetLeft = triggerRect.left - parentRect.left + triggerRect.width / 2;
      }

      setTimeout(() => {
        const popupEl = (tooltipRef.current as any)?.popupRef?.current?.getElement?.();

        if (popupEl) {
          const popupLeft = parseInt(popupEl.style.left);

          if (popupLeft !== undefined) {
            setLeft(offsetLeft - popupLeft);
          }
        } else {
          setLeft(offsetLeft);
        }

        // wait end of animation
      }, 50);

      return trigger.parentElement!;
    };

    const tooltipRef = React.useRef(null);

    return (
      <TooltipWrapStyled
        {...props}
        getPopupContainer={getPopupContainer}
        left={left}
        ref={(node) => {
          tooltipRef.current = node;
          if (ref) {
            if (typeof ref === 'function') {
              ref(node);
            } else {
              ref.current = node;
            }
          }
        }}
      />
    );
  }
);
