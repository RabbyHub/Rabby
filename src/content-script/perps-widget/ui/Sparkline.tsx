/** Pure-SVG mini sparkline. Green when last >= first, red otherwise; empty list → dashed placeholder. */

import React from 'react';

interface SparklineProps {
  prices: number[];
  width?: number;
  height?: number;
}

const FALLBACK_LINE_COLOR = 'rgba(255, 255, 255, 0.16)';

export const Sparkline: React.FC<SparklineProps> = ({
  prices,
  width = 125,
  height = 40,
}) => {
  const id = React.useId();

  if (!prices || prices.length < 2) {
    return (
      <svg
        className="rabby-perps-card__sparkline"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={FALLBACK_LINE_COLOR}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const padding = 2;

  // SVG y-axis grows downward, so invert the normalized value when projecting.
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const yNorm = (p - min) / range;
    const y = height - padding - yNorm * (height - 2 * padding);
    return { x, y };
  });

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? 'var(--rb-green-default)' : 'var(--rb-red-default)';
  const gradStop = isUp ? 'var(--rb-green-default)' : 'var(--rb-red-default)';

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');

  // Close the path down to the baseline so the gradient can fill underneath.
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  // Dashed 24h baseline = y of the very first point.
  const baselineY = points[0].y;

  return (
    <svg
      className="rabby-perps-card__sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradStop} stopOpacity={0.32} />
          <stop offset="100%" stopColor={gradStop} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line
        x1={0}
        y1={baselineY}
        x2={width}
        y2={baselineY}
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <path d={fillPath} fill={`url(#grad-${id})`} />
      <path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};
