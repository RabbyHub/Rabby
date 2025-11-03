import dayjs from 'dayjs';
import React from 'react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { AreaChart, YAxis, Area, XAxis, Tooltip } from 'recharts';
import styled, { createGlobalStyle } from 'styled-components';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/tips-cc.svg';
import { useTranslation } from 'react-i18next';
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
  showAppChainTips?: boolean;
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

const AppChainTips = styled.div`
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  font-size: 9px;
  opacity: 70%;
  pointer-events: none;
`;

export const CurveThumbnail = ({
  data,
  className,
  isHover,
  onHover,
  showAppChainTips = false,
}: CurveThumbnailProps) => {
  const color = useMemo(() => {
    return `var(--color-curve-${data?.isLoss ? 'red' : 'green'})`;
  }, [data]);
  const divRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(66);
  const [showTips, setShowTips] = useState(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseMoveCountRef = useRef(0);
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event: any) => {
    const currentX = event?.nativeEvent?.offsetX || 0;

    const distance = Math.abs(currentX - mousePositionRef.current.x);

    mousePositionRef.current = { x: currentX, y: 0 };

    const MOVE_THRESHOLD = 5;

    if (distance > MOVE_THRESHOLD) {
      mouseMoveCountRef.current += 1;

      if (mouseMoveCountRef.current >= 3 && isHover) {
        setShowTips(true);
      }
    }

    if (mouseMoveTimeoutRef.current) {
      clearTimeout(mouseMoveTimeoutRef.current);
    }

    mouseMoveTimeoutRef.current = setTimeout(() => {
      setShowTips(false);
    }, 500);
  };

  const handleMouseEnter = () => {
    mouseMoveCountRef.current = 0;
    setShowTips(false);
  };

  const handleMouseLeave = () => {
    setShowTips(false);
    mouseMoveCountRef.current = 0;
    mousePositionRef.current = { x: 0, y: 0 };

    if (mouseMoveTimeoutRef.current) {
      clearTimeout(mouseMoveTimeoutRef.current);
      mouseMoveTimeoutRef.current = null;
    }

    onHover(undefined);
  };

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
          width={368}
          height={height}
          style={{ position: 'absolute', left: 0, cursor: 'pointer' }}
          margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          onMouseMove={(val, event) => {
            if (val?.activePayload) {
              onHover(val.activePayload[0].payload);
            }
            if (showAppChainTips) {
              handleMouseMove(event);
            }
          }}
          onMouseEnter={showAppChainTips ? handleMouseEnter : undefined}
          onMouseLeave={() => {
            onHover(undefined);
            if (showAppChainTips) {
              handleMouseLeave();
            }
          }}
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
                return (
                  <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title2">
                    {dayjs(label * 1000).format('HH:mm')}
                  </div>
                );
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
      {showTips && (
        <AppChainTips>
          <div className="text-r-neutral-title2 mr-[2px]">
            <RcIconInfoCC width={12} height={12} />
          </div>
          <div className="text-r-neutral-title2 whitespace-nowrap">
            {t('page.dashboard.home.appChainTips')}
          </div>
        </AppChainTips>
      )}
    </CurveWrapper>
  );
};
