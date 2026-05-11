import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from 'antd';
import { TooltipProps } from 'antd/lib/tooltip';

function getScrollParents(el: HTMLElement): (HTMLElement | Window)[] {
  const parents: (HTMLElement | Window)[] = [];
  let current = el.parentElement;

  while (current) {
    const { overflow, overflowX, overflowY } = getComputedStyle(current);
    if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
      parents.push(current);
    }
    current = current.parentElement;
  }

  parents.push(window);
  return parents;
}

function isElementInScrollParents(
  el: HTMLElement,
  parents: (HTMLElement | Window)[]
): boolean {
  const rect = el.getBoundingClientRect();
  for (const parent of parents) {
    if (parent === window) continue;
    const parentRect = (parent as HTMLElement).getBoundingClientRect();
    if (
      rect.right < parentRect.left ||
      rect.left > parentRect.right ||
      rect.bottom < parentRect.top ||
      rect.top > parentRect.bottom
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Wrapper around antd Tooltip that:
 * 1. Calls forcePopupAlign() on ancestor scroll / resize
 * 2. Hides the tooltip when the anchor is scrolled out of any scroll container (horizontal or vertical)
 * 3. Re-checks on parent container resize
 */
export const ScrollAwareTooltip: React.FC<
  TooltipProps & { extraTip?: never }
> = ({ children, visible, ...restProps }) => {
  const tooltipRef = useRef<any>(null);
  const rafRef = useRef(0);
  const domRef = useRef<HTMLElement | null>(null);
  const scrollParentsRef = useRef<(HTMLElement | Window)[]>([]);
  const [isAnchorInView, setIsAnchorInView] = useState(true);

  const checkVisibility = useCallback(() => {
    const dom = domRef.current;
    if (!dom) return;

    const inView = isElementInScrollParents(dom, scrollParentsRef.current);
    setIsAnchorInView(inView);

    if (inView) {
      tooltipRef.current?.forcePopupAlign?.();
    }
  }, []);

  const handleScrollOrResize = useCallback(() => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      checkVisibility();
    });
  }, [checkVisibility]);

  useEffect(() => {
    // eslint-disable-next-line react/no-find-dom-node
    const dom = ReactDOM.findDOMNode(tooltipRef.current) as HTMLElement | null;
    if (!dom) return;

    domRef.current = dom;
    const scrollParents = getScrollParents(dom);
    scrollParentsRef.current = scrollParents;

    // Initial visibility check
    const initialInView = isElementInScrollParents(dom, scrollParents);
    setIsAnchorInView(initialInView);

    for (const parent of scrollParents) {
      parent.addEventListener('scroll', handleScrollOrResize, {
        passive: true,
      });
    }

    const elementParents = scrollParents.filter(
      (p) => p !== window
    ) as HTMLElement[];

    const resizeObserver = new ResizeObserver(() => {
      handleScrollOrResize();
    });
    for (const parent of elementParents) {
      resizeObserver.observe(parent);
    }

    return () => {
      for (const parent of scrollParents) {
        parent.removeEventListener('scroll', handleScrollOrResize);
      }
      resizeObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      domRef.current = null;
      scrollParentsRef.current = [];
    };
  }, [handleScrollOrResize]);

  const finalVisible =
    visible !== undefined
      ? visible && isAnchorInView
      : isAnchorInView
      ? undefined
      : false;

  return (
    <Tooltip {...restProps} visible={finalVisible} ref={tooltipRef}>
      {children}
    </Tooltip>
  );
};
