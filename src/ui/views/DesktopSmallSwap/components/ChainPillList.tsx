import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { ChainWithBalance } from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PortfolioPillItem {
  chain: string;
  accent: string;
  valueLabel: string;
}

interface ChainPillProps {
  data: ChainWithBalance;
  active?: boolean;
  onClick?(): void;
  disabled?: boolean;
}

const extraLabelButtonClassName = clsx(
  'flex-shrink-0 h-[40px] rounded-[16px] px-[12px] py-[10px]',
  'border border-rabby-neutral-line bg-r-neutral-card-1',
  'text-[15px] leading-[18px] text-r-neutral-body',
  'hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default'
);

export const ChainPillList = ({
  data,
  value,
  onChange,
  disabled,
}: {
  value?: string;
  data?: ChainWithBalance[];
  onChange?: (chain: string) => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const GAP = 10;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const extraMeasureRef = useRef<HTMLButtonElement | null>(null);
  const itemMeasureRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [visibleCount, setVisibleCount] = useState(data?.length || 0);
  const [expanded, setExpanded] = useState(false);

  const getExtraLabel = (hiddenCount: number) => {
    return t('page.desktopSmallSwap.moreChains', {
      count: hiddenCount,
    });
  };

  const hiddenCount = Math.max((data?.length || 0) - visibleCount, 0);
  const shouldShowExtra = hiddenCount > 0 && !expanded;

  const visibleItems = useMemo(() => {
    if (expanded || hiddenCount === 0) {
      return data;
    }

    return data?.slice(0, visibleCount) || [];
  }, [expanded, hiddenCount, data, visibleCount]);

  const renderPills = (
    pillItems?: ChainWithBalance[],
    shouldMeasure?: boolean
  ) => {
    return pillItems?.map((pill, index) => (
      <ChainPill
        disabled={disabled}
        data={pill}
        key={shouldMeasure ? `${pill.id}-measure` : pill.id}
        ref={
          shouldMeasure
            ? (node) => {
                itemMeasureRefs.current[index] = node;
              }
            : undefined
        }
        onClick={() => {
          if (!disabled) {
            onChange?.(pill.id);
          }
        }}
        active={pill.id === value}
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
      const itemWidths =
        data?.map(
          (_, index) => itemMeasureRefs.current[index]?.offsetWidth ?? 0
        ) || [];

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
  }, [data]);

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
        {renderPills(data, true)}
        <ExtraLabelButton
          ref={extraMeasureRef}
          label={getExtraLabel(Math.max((data?.length || 0) - 1, 1))}
        />
      </div>
    </>
  );
};

const ChainPill = React.forwardRef<HTMLButtonElement, ChainPillProps>(
  ({ data, active, onClick, disabled }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          'flex-shrink-0 h-[40px] rounded-[16px] px-[12px] py-[10px] inline-flex items-center gap-[8px]',
          'border',
          'hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default',
          active
            ? 'border-r-blue-default bg-r-blue-light1 text-r-blue-default'
            : 'border-rabby-neutral-line bg-r-neutral-card-1 text-r-neutral-body',
          disabled ? 'cursor-not-allowed' : ''
        )}
      >
        <img src={data.logo_url} className="w-[18px] h-[18px] rounded-full" />
        <div className="text-[15px] leading-[18px]">
          ${splitNumberByStep(data.usd_value.toFixed(2))}
        </div>
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
