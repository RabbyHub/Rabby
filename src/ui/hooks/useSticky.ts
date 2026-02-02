import { useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState } from 'react';

export function useSticky<T extends HTMLElement>(
  scrollElement?: HTMLElement | null
) {
  const stickyRef = useRef<T>(null);
  const [sticky, setSticky] = useState(false);
  const observe = useMemoizedFn(() => {
    if (!stickyRef.current) return;
    const computedStyle = getComputedStyle(stickyRef.current);
    const rect = stickyRef.current.getBoundingClientRect();

    let stickyActive = false;

    // Check if using sticky bottom
    if (computedStyle.bottom !== 'auto') {
      const stickyOffset = parseInt(computedStyle.bottom);
      const refPageOffset = rect.bottom;
      stickyActive = refPageOffset >= window.innerHeight - stickyOffset;
    }
    // Default to sticky top
    else {
      const stickyOffset = parseInt(computedStyle.top);
      const refPageOffset = rect.top;
      stickyActive = refPageOffset <= stickyOffset;
    }

    if (stickyActive && !sticky) setSticky(true);
    else if (!stickyActive && sticky) setSticky(false);
  });

  useEffect(() => {
    observe();
    // Bind events
    const scrollTarget = scrollElement || document;
    scrollTarget.addEventListener('scroll', observe);
    window.addEventListener('resize', observe);
    window.addEventListener('orientationchange', observe);

    return () => {
      scrollTarget.removeEventListener('scroll', observe);
      window.removeEventListener('resize', observe);
      window.removeEventListener('orientationchange', observe);
    };
  }, [scrollElement]);

  return { stickyRef, isSticky: sticky, observe };
}
