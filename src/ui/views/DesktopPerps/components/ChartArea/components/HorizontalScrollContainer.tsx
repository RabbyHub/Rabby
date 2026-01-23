import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import clsx from 'clsx';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  scrollStep?: number;
  showArrows?: boolean;
  arrowClassName?: string;
}

export const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({
  children,
  className = '',
  scrollStep = 200,
  showArrows = true,
  arrowClassName = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Check scroll buttons on mount and when children change
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      checkScrollButtons();
    });
    return () => cancelAnimationFrame(rafId);
  }, [checkScrollButtons, children]);

  // Add scroll and resize listeners
  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollButtons);
      }
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [checkScrollButtons]);

  const handleScrollLeft = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
  };

  return (
    <>
      {/* Left Arrow */}
      {showArrows && canScrollLeft && (
        <div
          className={clsx(
            'flex-shrink-0 flex items-center justify-center w-20 h-20 cursor-pointer text-r-neutral-foot hover:text-r-neutral-title-1',
            arrowClassName
          )}
          onClick={handleScrollLeft}
        >
          <RcIconArrowDownCC className="text-rb-neutral-secondary rotate-90" />
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className={clsx(
          'flex-1 flex overflow-x-auto scrollbar-hide whitespace-nowrap',
          className
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Right Arrow */}
      {showArrows && canScrollRight && (
        <div
          className={clsx(
            'flex-shrink-0 flex items-center justify-center w-20 h-20 cursor-pointer text-r-neutral-foot hover:text-r-neutral-title-1',
            arrowClassName
          )}
          onClick={handleScrollRight}
        >
          <RcIconArrowDownCC className="text-rb-neutral-secondary -rotate-90" />
        </div>
      )}
    </>
  );
};
