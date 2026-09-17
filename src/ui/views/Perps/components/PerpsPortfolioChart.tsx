import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import {
  toChartPoints,
  formatPortfolioTooltipTime,
} from '../utils/perpsPortfolio';
import type {
  PortfolioData,
  PortfolioPeriodKey,
  PortfolioChartPoint,
} from '../utils/perpsPortfolio';

export const PERIOD_TABS: { key: PortfolioPeriodKey; i18nKey: string }[] = [
  { key: 'day', i18nKey: 'page.perps.PerpsCard.period.day' },
  { key: 'week', i18nKey: 'page.perps.PerpsCard.period.week' },
  { key: 'month', i18nKey: 'page.perps.PerpsCard.period.month' },
  { key: 'allTime', i18nKey: 'page.perps.PerpsCard.period.all' },
];

const SPARKLINE_W = 140;
const SPARKLINE_H = 60;
const EXPANDED_H = 100;

// Draw-on reveal (left to right), mirroring mobile's PerpsPortfolioChart:
// 600ms for the expanded chart, 1000ms for the sparkline. recharts' default
// Area entrance is the same clip-rect sweep; a period switch remounts the
// chart (key={period}) so the sweep replays instead of morphing the old path.
const EXPANDED_REVEAL_MS = 600;
const SPARKLINE_REVEAL_MS = 1000;

// recharts activates the first/last point only when the mouse is past the
// midpoint to its neighbour. A dense series (1D ≈ 288 points over ~324px)
// leaves that band under 1px at the chart edges, so integer mouse columns
// never land in it. Padding the x scale (NOT the chart margin: recharts'
// inRange() rejects the margin zone, which would leave the band as thin as
// before and drop the cursor there) keeps the plot edge-to-edge while the
// edge points sit this far inside it, so the band is this wide.
const EDGE_HIT_PAD = 6;

// recharts cannot draw a path from a single point.
const FLAT_ZERO: PortfolioChartPoint[] = [
  { timestamp: 0, value: 0 },
  { timestamp: 1, value: 0 },
];

// Tooltip bubble geometry, mirroring mobile's TOOLTIP_TAIL_W / TAIL_H /
// POINT_GAP. The tail overlaps the bubble by 1px so the two shapes read as
// one — flush, an anti-aliased boundary shows a hairline seam.
const TAIL_W = 12;
const TAIL_H = 5;
const TAIL_OVERLAP = 1;
const GAP_ABOVE_POINT = 4;
const BUBBLE_RADIUS = 8;
// Keep the whole tail base off the rounded corners.
const TAIL_CLEARANCE = TAIL_W / 2 + BUBBLE_RADIUS;
const BUBBLE_BG = 'rgba(19, 20, 22, 0.95)';

export const PerpsPortfolioChart: React.FC<{
  data: PortfolioData | null;
  expanded: boolean;
  isEmpty: boolean;
  period: PortfolioPeriodKey;
  onPeriodChange: (p: PortfolioPeriodKey) => void;
}> = ({ data, expanded, isEmpty, period, onPeriodChange }) => {
  const { t } = useTranslation();

  const points = useMemo(() => {
    if (isEmpty || !data) return FLAT_ZERO;
    const chartPoints = toChartPoints(data[period]);
    if (!chartPoints.length) return FLAT_ZERO;
    const [only] = chartPoints;
    if (chartPoints.length === 1 && only) {
      return [only, { ...only, timestamp: only.timestamp + 1 }];
    }
    return chartPoints;
  }, [data, isEmpty, period]);

  const color = 'var(--r-blue-default, #4c65ff)';
  const showInteraction = expanded && !isEmpty;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  // Written by the activeDot render function: the point's REAL y on the curve.
  const activeDotYRef = useRef<number | null>(null);
  const [hover, setHover] = useState<{
    x: number;
    point: PortfolioChartPoint;
  } | null>(null);
  // Measured after the bubble renders for the current hover; the bubble stays
  // invisible until then (mobile hides it until onLayout the same way).
  const [bubbleLayout, setBubbleLayout] = useState<{
    w: number;
    y: number;
    containerW: number;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (state: any) => {
    if (!showInteraction) return;
    const coord = state?.activeCoordinate;
    const point = state?.activePayload?.[0]?.payload as
      | PortfolioChartPoint
      | undefined;
    // Only coord.x is usable: coord.y is the MOUSE y (recharts passes
    // rangeObj.y through for horizontal layouts, not the point's position on
    // the curve). The curve y arrives via activeDotYRef and is picked up by
    // the layout effect below, before paint.
    //
    // recharts also calls this with `isTooltipActive: false` (no coord, no
    // payload) when the pointer is inside the SVG but outside the plot area.
    // It hides its own cursor and active dot then, so drop the bubble too —
    // otherwise it lingers at the previous point with a stale y.
    if (coord && point) setHover({ x: coord.x, point });
    else setHover(null);
  };
  const handleMouseLeave = () => setHover(null);

  // recharts batches its own active-index state with our setHover (both run
  // inside its mouse handler), so by the time this runs the activeDot for
  // this hover has rendered and written its cy. Measure everything the bubble
  // needs here, before paint, so the first painted frame is already right.
  useLayoutEffect(() => {
    if (!hover) {
      setBubbleLayout(null);
      return;
    }
    const w = bubbleRef.current?.offsetWidth ?? 0;
    const y = activeDotYRef.current;
    const containerW = wrapperRef.current?.clientWidth ?? 0;
    if (!w || y == null) return;
    setBubbleLayout((prev) =>
      prev && prev.w === w && prev.y === y && prev.containerW === containerW
        ? prev
        : { w, y, containerW }
    );
  }, [hover]);

  // Collapsing unmounts the expanded chart (its mouseleave never fires), and
  // switching period swaps the dataset under the cursor.
  useEffect(() => {
    setHover(null);
  }, [expanded, period]);

  const bubblePos = useMemo(() => {
    if (!hover || !bubbleLayout) return null;
    const { w, y, containerW } = bubbleLayout;
    let left = hover.x - w / 2;
    if (containerW > 0) {
      left = Math.min(Math.max(left, 0), Math.max(containerW - w, 0));
    }
    // The tail keeps pointing at the hovered x even when the bubble is
    // clamped at an edge, but never rides onto the rounded corners.
    const tailLeft = Math.min(
      Math.max(hover.x - left, TAIL_CLEARANCE),
      Math.max(w - TAIL_CLEARANCE, TAIL_CLEARANCE)
    );
    // Bubble bottom edge = point y − gap − the tail's visible height.
    const top = y - GAP_ABOVE_POINT - (TAIL_H - TAIL_OVERLAP);
    return { left, top, tailLeft };
  }, [hover, bubbleLayout]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderActiveDot = (props: any) => {
    activeDotYRef.current = typeof props?.cy === 'number' ? props.cy : null;
    return (
      <circle cx={props.cx} cy={props.cy} r={3} fill={color} strokeWidth={0} />
    );
  };

  const chartChildren = (
    <>
      <defs>
        <linearGradient id="perpsPortfolioCurve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis
        dataKey="timestamp"
        hide
        type="number"
        domain={['dataMin', 'dataMax']}
        padding={
          expanded ? { left: EDGE_HIT_PAD, right: EDGE_HIT_PAD } : undefined
        }
      />
      <YAxis
        hide
        domain={[(min: number) => min * 0.98, (max: number) => max * 1.005]}
      />
      {showInteraction && (
        // Only here for the dashed cursor line; the bubble is drawn by the
        // overlay below so it can sit centered above the point with a tail,
        // which recharts' cursor-relative tooltip cannot do.
        <Tooltip
          cursor={{ strokeDasharray: '2 2', strokeWidth: 1 }}
          content={() => null}
        />
      )}
      <Area
        type="linear"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        fill="url(#perpsPortfolioCurve)"
        fillOpacity={0.8}
        animationDuration={expanded ? EXPANDED_REVEAL_MS : SPARKLINE_REVEAL_MS}
        animationEasing="ease-in-out"
        dot={false}
        activeDot={showInteraction ? renderActiveDot : false}
      />
    </>
  );

  return (
    <div
      ref={wrapperRef}
      className={clsx(
        'flex flex-col items-center',
        expanded && 'gap-[6px] w-full relative'
      )}
    >
      {expanded ? (
        <ResponsiveContainer width="100%" height={EXPANDED_H}>
          <AreaChart
            key={period}
            data={points}
            margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {chartChildren}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <AreaChart
          data={points}
          width={SPARKLINE_W}
          height={SPARKLINE_H}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          {chartChildren}
        </AreaChart>
      )}
      {showInteraction && hover && (
        <div
          ref={bubbleRef}
          className="absolute pointer-events-none z-10"
          style={{
            left: bubblePos?.left ?? 0,
            top: bubblePos?.top ?? 0,
            transform: 'translateY(-100%)',
            visibility: bubblePos ? 'visible' : 'hidden',
          }}
        >
          <div
            className={clsx(
              'rounded-[8px] px-[10px] py-[8px]',
              'text-[12px] leading-[16px] whitespace-nowrap'
            )}
            style={{ background: BUBBLE_BG }}
          >
            <div className="text-[#C5C5CF]">
              {formatPortfolioTooltipTime(hover.point.timestamp)}
            </div>
            <div className="font-bold text-white">
              {formatUsdValue(hover.point.value, BigNumber.ROUND_DOWN)}
            </div>
          </div>
          <div
            className="absolute w-0 h-0"
            style={{
              left: bubblePos?.tailLeft ?? 0,
              bottom: -(TAIL_H - TAIL_OVERLAP),
              transform: 'translateX(-50%)',
              borderLeft: `${TAIL_W / 2}px solid transparent`,
              borderRight: `${TAIL_W / 2}px solid transparent`,
              borderTop: `${TAIL_H}px solid ${BUBBLE_BG}`,
            }}
          />
        </div>
      )}
      {expanded && (
        <div className="flex items-center justify-around w-full">
          {PERIOD_TABS.map((tab) => (
            <div
              key={tab.key}
              className={clsx(
                'text-[12px] leading-[16px] cursor-pointer',
                period === tab.key
                  ? 'font-bold text-r-blue-default'
                  : 'font-normal text-rb-neutral-secondary'
              )}
              onClick={() => onPeriodChange(tab.key)}
            >
              {t(tab.i18nKey)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
