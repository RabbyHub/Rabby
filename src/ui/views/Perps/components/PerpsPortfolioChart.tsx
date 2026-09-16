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
  type PortfolioData,
  type PortfolioPeriodKey,
  type PortfolioChartPoint,
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

// recharts cannot draw a path from a single point.
const FLAT_ZERO: PortfolioChartPoint[] = [
  { timestamp: 0, value: 0 },
  { timestamp: 1, value: 0 },
];

const ARROW_W = 12;
const ARROW_H = 5.25;
const GAP_ABOVE_POINT = 4;
const BUBBLE_RADIUS = 8;
// Keep the whole arrow base off the rounded corners.
const ARROW_CLEARANCE = ARROW_W / 2 + BUBBLE_RADIUS;

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
    y: number;
    point: PortfolioChartPoint;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = (state: any) => {
    if (!showInteraction) return;
    const coord = state?.activeCoordinate;
    const point = state?.activePayload?.[0]?.payload as
      | PortfolioChartPoint
      | undefined;
    // coord.y here is the MOUSE y (recharts passes rangeObj.y through for
    // horizontal layouts, not the point's position on the curve); the real
    // curve y arrives separately via activeDotYRef, synced in the
    // useLayoutEffect below before paint.
    if (coord && point) setHover({ x: coord.x, y: coord.y, point });
  };
  const handleMouseLeave = () => setHover(null);

  // After recharts has rendered the active dot for this hover, replace the
  // mouse y with the dot's cy before paint so the arrow points at the curve.
  useLayoutEffect(() => {
    if (!hover) return;
    const cy = activeDotYRef.current;
    if (cy != null && cy !== hover.y) {
      setHover((prev) => (prev ? { ...prev, y: cy } : prev));
    }
  }, [hover]);

  // Collapsing unmounts the expanded chart (its mouseleave never fires), and
  // switching period swaps the dataset under the cursor.
  useEffect(() => {
    setHover(null);
  }, [expanded, period]);

  const bubblePos = useMemo(() => {
    if (!hover) return null;
    const containerW = wrapperRef.current?.clientWidth ?? 0;
    const bubbleW = bubbleRef.current?.offsetWidth ?? 100; // first frame: estimate
    let left = hover.x - bubbleW / 2;
    if (containerW > 0) {
      left = Math.min(Math.max(left, 0), Math.max(containerW - bubbleW, 0));
    }
    // Arrow x inside the bubble, kept off the rounded corners.
    const arrowLeft = Math.min(
      Math.max(hover.x - left, ARROW_CLEARANCE),
      Math.max(bubbleW - ARROW_CLEARANCE, ARROW_CLEARANCE)
    );
    return { left, arrowLeft };
  }, [hover]);

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
      />
      <YAxis
        hide
        domain={[(min: number) => min * 0.98, (max: number) => max * 1.005]}
      />
      {showInteraction && (
        // Only here for the dashed cursor line; the bubble is drawn by the
        // overlay below so it can sit centred above the point with an arrow,
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
        animationDuration={0}
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
      {showInteraction && hover && bubblePos && (
        <div
          ref={bubbleRef}
          className="absolute pointer-events-none z-10"
          style={{
            left: bubblePos.left,
            top: hover.y - ARROW_H - GAP_ABOVE_POINT,
            transform: 'translateY(-100%)',
          }}
        >
          <div
            className={clsx(
              'rounded-[8px] px-[10px] py-[8px]',
              'text-[12px] leading-[16px] text-white whitespace-nowrap'
            )}
            style={{ background: 'rgba(19,20,22,0.95)', backdropFilter: 'blur(2px)' }}
          >
            <div>{formatPortfolioTooltipTime(hover.point.timestamp)}</div>
            <div>{formatUsdValue(hover.point.value, BigNumber.ROUND_DOWN)}</div>
          </div>
          <div
            className="absolute w-0 h-0"
            style={{
              left: bubblePos.arrowLeft,
              bottom: -ARROW_H,
              transform: 'translateX(-50%)',
              borderLeft: `${ARROW_W / 2}px solid transparent`,
              borderRight: `${ARROW_W / 2}px solid transparent`,
              borderTop: `${ARROW_H}px solid rgba(19,20,22,0.95)`,
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
