import React, { useCallback, useEffect, useRef } from 'react';
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

/**
 * Wrapper around antd Tooltip that calls forcePopupAlign() on ancestor scroll,
 * so the tooltip follows the anchor element. Original visible/show logic is untouched.
 */
export const ScrollAwareTooltip: React.FC<
  TooltipProps & { extraTip?: never }
> = ({ children, ...props }) => {
  const tooltipRef = useRef<any>(null);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      tooltipRef.current?.forcePopupAlign?.();
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/no-find-dom-node
    const dom = ReactDOM.findDOMNode(tooltipRef.current) as HTMLElement | null;
    if (!dom) return;

    const scrollParents = getScrollParents(dom);

    for (const parent of scrollParents) {
      parent.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      for (const parent of scrollParents) {
        parent.removeEventListener('scroll', handleScroll);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [handleScroll]);

  return (
    <Tooltip {...props} ref={tooltipRef}>
      {children}
    </Tooltip>
  );
};
