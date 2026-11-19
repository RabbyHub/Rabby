import { useEffect } from 'react';

const mountedCounts = new Map<string, number>();

/**
 * Keeps `className` on <html> while at least one mounted caller has `active`
 * set. Use it for styles that must reach outside a component (antd portals,
 * body), with the rules written under that class in a .module.css:
 * `.globalActive :global(.ant-tooltip-arrow) { ... }`.
 *
 * Counted per class, so several instances of the same component can mount
 * and unmount in any order.
 */
export const useDocumentClass = (className: string, active = true) => {
  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    mountedCounts.set(className, (mountedCounts.get(className) || 0) + 1);
    root.classList.add(className);

    return () => {
      const remaining = (mountedCounts.get(className) || 1) - 1;
      if (remaining > 0) {
        mountedCounts.set(className, remaining);
      } else {
        mountedCounts.delete(className);
        root.classList.remove(className);
      }
    };
  }, [className, active]);
};
