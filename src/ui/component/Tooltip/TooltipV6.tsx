import RcTooltip from 'rc-tooltip';
import clsx from 'clsx';
import React from 'react';

/**
 * Tooltip that ports antd v6's arrow-alignment behavior onto the antd v4 stack.
 *
 * Why not `antd`'s `<Tooltip>`:
 *   antd v4's Tooltip force-overrides `onPopupAlign` internally, so the arrow
 *   position can only be reconstructed *after* the popup has been painted —
 *   which is why the arrow visibly jumps, and why the old
 *   `TooltipWithMagnetArrow` had to swap the popup container (breaking flip
 *   detection). This component talks to `rc-tooltip` directly, so it can run
 *   the arrow math inside the same align pass, before paint.
 *
 * How antd v6 places the arrow (see @rc-component/trigger `useAlign`):
 *   the arrow is centered on the *overlap region* between the popup and the
 *   target along the placement axis — `center = (max(starts) + min(ends)) / 2`.
 *   When the target sits fully inside the popup this equals the target center;
 *   when the popup is shifted to stay on-screen the arrow stays within the
 *   popup and keeps pointing at the shared area, instead of detaching.
 *
 * FIXME: remove once the project upgrades to antd 5.x / 6.x, whose built-in
 * Tooltip already does all of this.
 */

const PREFIX = 'ant-tooltip';

type TriggerAction = 'hover' | 'click' | 'focus' | 'contextMenu';

export type TooltipV6Placement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom';

export interface TooltipV6Props {
  title?: React.ReactNode;
  /** alias of `title`, for antd Tooltip compatibility */
  overlay?: React.ReactNode;
  placement?: TooltipV6Placement;
  trigger?: TriggerAction | TriggerAction[];
  /** controlled visibility (`open` is accepted as an alias) */
  visible?: boolean;
  open?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  onOpenChange?: (visible: boolean) => void;
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
  overlayClassName?: string;
  /** alias of `overlayClassName` */
  className?: string;
  overlayStyle?: React.CSSProperties;
  overlayInnerStyle?: React.CSSProperties;
  align?: Record<string, unknown>;
  getPopupContainer?: (node: HTMLElement) => HTMLElement;
  getTooltipContainer?: (node: HTMLElement) => HTMLElement;
  zIndex?: number;
  destroyTooltipOnHide?: boolean;
  showArrow?: boolean;
  children: React.ReactElement;
}

const isVerticalPlacement = (points?: string[]) => {
  // top/bottom placements pin the popup by its bottom/top-center point
  // (`bc`/`tc`/`bl`/`br`/`tl`/`tr`); left/right use center points (`cl`/`cr`).
  const popupPoint = points?.[0] ?? '';
  return !popupPoint.startsWith('c');
};

const alignArrow = (
  popupNode: HTMLElement,
  targetNode: HTMLElement | null | undefined,
  matchPoints?: string[]
) => {
  if (!targetNode) return;
  const arrowEl = popupNode.querySelector<HTMLElement>(`.${PREFIX}-arrow`);
  if (!arrowEl) return;

  const anchor = (arrowEl.offsetParent as HTMLElement | null) ?? popupNode;
  const anchorRect = anchor.getBoundingClientRect();
  const targetRect = targetNode.getBoundingClientRect();
  const popupRect = popupNode.getBoundingClientRect();

  if (isVerticalPlacement(matchPoints)) {
    // arrow slides horizontally to the center of the horizontal overlap
    const start = Math.max(anchorRect.left, targetRect.left);
    const end = Math.min(anchorRect.right, targetRect.right);
    const center = (start + end) / 2;
    arrowEl.style.left = `${center - anchorRect.left}px`;
    arrowEl.style.right = 'auto';

    const isTop = (matchPoints?.[0] ?? '').startsWith('b');
    popupNode.style.transformOrigin = `${center - popupRect.left}px ${
      isTop ? '100%' : '0'
    }`;
  } else {
    // left/right placement: arrow slides vertically
    const start = Math.max(anchorRect.top, targetRect.top);
    const end = Math.min(anchorRect.bottom, targetRect.bottom);
    const center = (start + end) / 2;
    arrowEl.style.top = `${center - anchorRect.top}px`;
    arrowEl.style.bottom = 'auto';

    const isLeft = (matchPoints?.[0] ?? '').endsWith('r');
    popupNode.style.transformOrigin = `${isLeft ? '100%' : '0'} ${
      center - popupRect.top
    }px`;
  }
};

export const TooltipV6 = React.forwardRef<any, TooltipV6Props>(
  (
    {
      title,
      overlay,
      placement = 'top',
      trigger = 'hover',
      visible,
      open,
      onVisibleChange,
      onOpenChange,
      overlayClassName,
      className,
      getPopupContainer,
      getTooltipContainer,
      showArrow = true,
      children,
      ...rest
    },
    ref
  ) => {
    const instRef = React.useRef<any>(null);

    const setRef = React.useCallback(
      (node: any) => {
        instRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<any>).current = node;
      },
      [ref]
    );

    const handlePopupAlign = React.useCallback(
      (popupNode: HTMLElement, matchAlign: { points?: string[] }) => {
        alignArrow(
          popupNode,
          instRef.current?.getRootDomNode?.() ?? null,
          matchAlign?.points
        );
      },
      []
    );

    const controlledVisible = open ?? visible;
    const handleVisibleChange = onVisibleChange ?? onOpenChange;

    return (
      <RcTooltip
        ref={setRef}
        prefixCls={PREFIX}
        placement={placement}
        trigger={Array.isArray(trigger) ? trigger : [trigger]}
        overlay={title ?? overlay}
        overlayClassName={clsx(overlayClassName, className)}
        showArrow={showArrow}
        arrowContent={<span className={`${PREFIX}-arrow-content`} />}
        transitionName="ant-zoom-big-fast"
        getTooltipContainer={
          getPopupContainer ?? getTooltipContainer ?? (() => document.body)
        }
        onPopupAlign={handlePopupAlign}
        {...(controlledVisible === undefined
          ? {}
          : { visible: controlledVisible })}
        onVisibleChange={handleVisibleChange}
        {...rest}
      >
        {children}
      </RcTooltip>
    );
  }
);

TooltipV6.displayName = 'TooltipV6';

export default TooltipV6;
