import dayjs from 'dayjs';
import React from 'react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { AreaChart, YAxis, Area, XAxis, Tooltip } from 'recharts';
import styled, { createGlobalStyle } from 'styled-components';

export type CurvePoint = {
  value: number;
  netWorth: string;
  change: string;
  isLoss: boolean;
  changePercent: string;
  timestamp: number;
};

type Curve = {
  list: CurvePoint[];
  netWorth: string;
  change: string;
  changePercent: string;
  isLoss: boolean;
  isEmptyAssets: boolean;
};

type CurveThumbnailProps = {
  className?: string;
  data?: Curve;
  isHover?: boolean;
  onHover: (point?: CurvePoint) => void;
};

const CurveWrapper = styled.div`
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const CurveGlobalStyle = createGlobalStyle`
  :root {
    --color-curve-green: #28E43B;
    --color-curve-red: #FF6A6B;
  }
`;

export const CurveThumbnail = ({
  data,
  className,
  isHover,
  onHover,
}: CurveThumbnailProps) => {
  const color = useMemo(() => {
    return `var(--color-curve-${data?.isLoss ? 'red' : 'green'})`;
  }, [data]);
  const divRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(92);

  useEffect(() => {
    if (divRef.current) {
      setHeight(divRef.current.clientHeight);
    }
  }, []);

  const isEmpty = !data;

  return (
    <CurveWrapper ref={divRef} className={className}>
      <CurveGlobalStyle />
      {isEmpty ? null : (
        <AreaChart
          data={data?.list}
          width={380}
          height={height}
          style={{ position: 'absolute', left: 0, cursor: 'pointer' }}
          margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          onMouseMove={(val) => {
            if (val?.activePayload) {
              onHover(val.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => onHover(undefined)}
        >
          <defs>
            <linearGradient id="curveThumbnail" x1="0" y1="0" x2="0" y2="1">
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
            domain={[(dataMin) => dataMin * 0.98, (dataMax) => dataMax * 1.005]}
          />
          {isHover && (
            <Tooltip
              cursor={{ strokeDasharray: '2 2', strokeWidth: 0.6 }}
              content={({ label }) => {
                return <div>{dayjs(label * 1000).format('HH:mm')}</div>;
              }}
            />
          )}
          <Area
            type="linear"
            dataKey="value"
            stroke={color}
            strokeOpacity={isHover ? 1 : 0.7}
            strokeWidth={2}
            fill="url(#curveThumbnail)"
            animationDuration={0}
            fillOpacity={0.8}
          />
        </AreaChart>
      )}
    </CurveWrapper>
  );
};
