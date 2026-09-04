import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/** Reset only the nearest overflow ancestor that is actually scrolled. */
function scrollNearestOverflowToTop(from: HTMLElement | null) {
  let parent = from?.parentElement ?? null;
  while (parent && parent !== document.documentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollTop > 0
    ) {
      parent.scrollTop = 0;
      return;
    }
    parent = parent.parentElement;
  }
}

/** Expand/collapse; collapse scrolls the nearest overflow parent to top once. */
export function useExpandableList(initial = false) {
  const [showMore, setShowMore] = useState(initial);
  const rootRef = useRef<HTMLDivElement>(null);

  const expand = useCallback(() => {
    setShowMore(true);
  }, []);

  const collapse = useCallback(() => {
    flushSync(() => {
      setShowMore(false);
    });
    scrollNearestOverflowToTop(rootRef.current);
  }, []);

  return {
    showMore,
    setShowMore,
    expand,
    collapse,
    rootRef,
  };
}
