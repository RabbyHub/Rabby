import { Tooltip as AntdTooltip, TooltipProps } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styles from './TooltipWithMagnetArrow.module.css';

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

/**
 * @deprecated use TooltipV6 instead
 * FIXME: the bug is fixed in antd 5.x, so we can remove this component after upgrade
 * see https://ant.design/docs/blog/tooltip-align
 *
 * Tooltip with magnet arrow
 *
 * 0. **trigger element's parent should have `position: relative`**
 * 1. auto align tooltip arrow to the middle of the trigger element
 * 2. attach tooltip to the trigger element's parent
 * 3. only support bottom or top placement
 *
 * New feature:
 * - viewportOffset: [top, right, bottom, left], offset of the tooltip to the viewport
 * - inApproval: if in approval page, the tooltip will have a viewportOffset of [0, -16, 0, 16]
 */
export const TooltipWithMagnetArrow = React.forwardRef<
  any,
  TooltipProps & {
    viewportOffset?: [number, number, number, number];
    inApproval?: boolean;
    disableLeft?: boolean;
  }
>(({ viewportOffset, inApproval, ...props }, ref) => {
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

  const currentViewportOffset = React.useMemo(() => {
    if (!viewportOffset) {
      return inApproval ? [0, -16, 0, 16] : [0, 0, 0, 0];
    }

    return viewportOffset;
  }, [viewportOffset]);

  const arrowLeft = props.disableLeft ? 0 : left;

  return (
    <TooltipWrap
      align={
        {
          viewportOffset: currentViewportOffset,
        } as any
      }
      {...props}
      className={clsx(
        props.className,
        styles.tooltip,
        arrowLeft && styles.arrowLeft
      )}
      overlayStyle={
        arrowLeft
          ? ({
              ...props.overlayStyle,
              '--magnet-arrow-left': `${arrowLeft}px`,
            } as React.CSSProperties)
          : props.overlayStyle
      }
      getPopupContainer={getPopupContainer}
      left={arrowLeft}
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
});
