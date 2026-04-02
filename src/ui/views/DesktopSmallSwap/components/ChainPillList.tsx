import clsx from 'clsx';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface PortfolioPillItem {
  chain: string;
  accent: string;
  valueLabel: string;
}

interface ChainPillProps {
  chain: string;
  balance?: string;
  active?: boolean;
}

const extraLabelButtonClassName = clsx(
  'flex-shrink-0 h-[40px] rounded-[16px] px-[12px] py-[10px]',
  'border border-rabby-neutral-line bg-r-neutral-card-1',
  'text-[15px] leading-[18px] text-r-neutral-body',
  'hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default'
);

export const ChainPillList = ({
  items,
  activeIndex = 0,
  extraLabel,
}: {
  items: PortfolioPillItem[];
  activeIndex?: number;
  extraLabel?: string | ((hiddenCount: number) => string);
}) => {
  const GAP = 10;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const extraMeasureRef = useRef<HTMLButtonElement | null>(null);
  const itemMeasureRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [expanded, setExpanded] = useState(false);

  const getExtraLabel = (hiddenCount: number) => {
    if (typeof extraLabel === 'function') {
      return extraLabel(hiddenCount);
    }

    if (typeof extraLabel === 'string') {
      return extraLabel;
    }

    return `+${hiddenCount} chains`;
  };

  const hiddenCount = Math.max(items.length - visibleCount, 0);
  const shouldShowExtra = hiddenCount > 0 && !expanded;

  const visibleItems = useMemo(() => {
    if (expanded || hiddenCount === 0) {
      return items;
    }

    return items.slice(0, visibleCount);
  }, [expanded, hiddenCount, items, visibleCount]);

  const renderPills = (
    pillItems: PortfolioPillItem[],
    shouldMeasure?: boolean
  ) => {
    return pillItems.map((pill, index) => (
      <ChainPill
        key={shouldMeasure ? `${pill.chain}-measure` : pill.chain}
        ref={
          shouldMeasure
            ? (node) => {
                itemMeasureRefs.current[index] = node;
              }
            : undefined
        }
        chain={pill.chain}
        balance={pill.valueLabel}
        active={index === activeIndex}
      />
    ));
  };

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const measure = () => {
      const containerWidth = container.clientWidth;
      const extraWidth = extraMeasureRef.current?.offsetWidth ?? 0;
      const itemWidths = items.map(
        (_, index) => itemMeasureRefs.current[index]?.offsetWidth ?? 0
      );

      let nextVisibleCount = itemWidths.length;
      let usedWidth = 0;

      for (let index = 0; index < itemWidths.length; index += 1) {
        const nextItemWidth = itemWidths[index];
        const nextWidth =
          index === 0 ? nextItemWidth : usedWidth + GAP + nextItemWidth;
        const remainingCount = itemWidths.length - index - 1;
        const reservedExtraWidth = remainingCount > 0 ? GAP + extraWidth : 0;

        if (nextWidth + reservedExtraWidth > containerWidth) {
          nextVisibleCount = index;
          break;
        }

        usedWidth = nextWidth;
      }

      setVisibleCount(nextVisibleCount);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [items, extraLabel]);

  return (
    <>
      <div
        ref={containerRef}
        className={clsx(
          'flex items-center gap-[10px] mb-[32px]',
          expanded ? 'flex-wrap overflow-visible' : 'overflow-hidden'
        )}
      >
        {renderPills(visibleItems)}
        {shouldShowExtra ? (
          <ExtraLabelButton
            label={getExtraLabel(hiddenCount)}
            onClick={() => {
              setExpanded(true);
            }}
          />
        ) : null}
      </div>

      <div className="absolute left-0 top-0 -z-10 invisible pointer-events-none flex items-center gap-[10px] whitespace-nowrap">
        {renderPills(items, true)}
        <ExtraLabelButton
          ref={extraMeasureRef}
          label={getExtraLabel(Math.max(items.length - 1, 1))}
        />
      </div>
    </>
  );
};

const ChainPill = React.forwardRef<HTMLButtonElement, ChainPillProps>(
  ({ active, chain, balance }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          'flex-shrink-0 h-[40px] rounded-[16px] px-[12px] py-[10px] inline-flex items-center gap-[8px]',
          'border',
          'hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default',
          active
            ? 'border-r-blue-default bg-r-blue-light1 text-r-blue-default'
            : 'border-rabby-neutral-line bg-r-neutral-card-1 text-r-neutral-body'
        )}
      >
        <img
          src="https://static.debank.com/image/chain/logo_url/eth/42ba589cd077e7bdd97db6480b0ff61d.png"
          className="w-[18px] h-[18px] rounded-full"
        />
        <div className="text-[15px] leading-[18px]">{balance}</div>
      </button>
    );
  }
);

ChainPill.displayName = 'ChainPill';

const ExtraLabelButton = React.forwardRef<
  HTMLButtonElement,
  {
    label: string;
    onClick?: () => void;
  }
>(({ label, onClick }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={extraLabelButtonClassName}
    >
      {label}
    </button>
  );
});

ExtraLabelButton.displayName = 'ExtraLabelButton';
