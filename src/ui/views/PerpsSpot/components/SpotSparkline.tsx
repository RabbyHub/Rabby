import React, { useMemo } from 'react';
import { buildSparklinePath } from '../utils/spotSparklinePath';

const VIEW_WIDTH = 360;

export const SpotSparkline: React.FC<{
  closes: number[];
  height?: number;
}> = ({ closes, height = 120 }) => {
  const { line, area } = useMemo(
    () => buildSparklinePath(closes, VIEW_WIDTH, height),
    [closes, height]
  );
  const isUp = closes.length < 2 || closes[closes.length - 1] >= closes[0];
  const colorClass = isUp ? 'text-r-green-default' : 'text-r-red-default';

  return (
    <div className={colorClass} style={{ height }}>
      {line ? (
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          preserveAspectRatio="none"
        >
          <path d={area} fill="currentColor" fillOpacity={0.08} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </div>
  );
};
