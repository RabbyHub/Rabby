import React, { useMemo } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  YAxis,
} from 'recharts';

import { PoolTypeTag, ProtocolIconChip, TokenLogos } from './PoolVisuals';
import type {
  StakingPool,
  StakingPoolCurveMetric,
  StakingPoolCurvePoint,
} from '../types';
import {
  formatStakingNumber,
  formatStakingPercent,
  formatStakingTVL,
} from '../utils/format';

const getFeeTag = (pool: StakingPool) =>
  pool.tags?.find((tag) => /\d+(\.\d+)?%/.test(tag.name));

const getExtraTags = (pool: StakingPool) => {
  const feeTag = getFeeTag(pool);
  const builtInTagNames = new Set([
    'yield',
    'lp',
    'v2',
    'v3',
    feeTag?.name?.toLowerCase() || '',
  ]);

  return (pool.tags || [])
    .filter((tag) => !builtInTagNames.has(tag.name.toLowerCase()))
    .slice(0, 2);
};

const getMetricText = (pool: StakingPool, metric: StakingPoolCurveMetric) =>
  metric === 'apr'
    ? formatStakingPercent(pool.apr)
    : formatStakingTVL(pool.tvl);

const getMetricLabel = (
  pool: StakingPool,
  metric: StakingPoolCurveMetric,
  tvlLabel: string
) => (metric === 'apr' ? pool.metricLabel : tvlLabel);

const getOrdinalSuffix = (day: number) => {
  if (day >= 11 && day <= 13) {
    return 'th';
  }

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const formatChartDateLabel = (timestamp: number) => {
  const date = dayjs.unix(timestamp);
  const day = date.date();
  return `${date.format('MMM')} ${day}${getOrdinalSuffix(day)}`;
};

const DetailTags = ({ pool }: { pool: StakingPool }) => {
  const feeTag = getFeeTag(pool);
  const extraTags = getExtraTags(pool);

  return (
    <div className="flex min-w-0 items-center gap-[6px] overflow-hidden">
      <ProtocolIconChip protocol={pool.protocol} />
      <PoolTypeTag pool={pool} size="detail" />
      {feeTag ? (
        <span className="staking-chip staking-chip-detail">{feeTag.name}</span>
      ) : null}
      {extraTags.map((tag) => (
        <span
          key={tag.id || tag.name}
          className="staking-chip staking-chip-detail"
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
};

const CurveTooltip = ({
  active,
  payload,
  label,
  metric,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ value?: unknown; payload?: { label?: string } }>;
  label?: string;
  metric: StakingPoolCurveMetric;
  metricLabel: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const value = Number(payload[0]?.value);
  const valueText =
    metric === 'apr'
      ? `${formatStakingNumber(value)}%`
      : formatStakingTVL(value);
  const markerColor =
    metric === 'apr' ? 'var(--r-green-default)' : 'var(--r-blue-default)';
  const dateLabel = payload[0]?.payload?.label || label;

  return (
    <div className="staking-chart-tooltip">
      <div className="staking-chart-tooltip-date">{dateLabel}</div>
      <div className="staking-chart-tooltip-row">
        <div className="staking-chart-tooltip-label">
          <span
            className="staking-chart-tooltip-marker"
            style={{ background: markerColor }}
          />
          <span>{metricLabel}</span>
        </div>
        <span>{valueText}</span>
      </div>
    </div>
  );
};

const PoolCurve = ({
  points,
  loading,
  metric,
  metricLabel,
}: {
  points: StakingPoolCurvePoint[];
  loading: boolean;
  metric: StakingPoolCurveMetric;
  metricLabel: string;
}) => {
  const { t } = useTranslation();
  const curveColor =
    metric === 'apr' ? 'var(--r-green-default)' : 'var(--r-blue-default)';
  const chartData = useMemo(
    () =>
      points.map((point) => ({
        label: formatChartDateLabel(point.timestamp),
        value: metric === 'apr' ? point.value * 100 : point.value,
      })),
    [metric, points]
  );

  if (loading) {
    return <div className="staking-chart-skeleton" />;
  }

  if (!chartData.length) {
    return (
      <div className="staking-chart-empty text-r-neutral-foot">
        {t('page.staking.detail.noChartData')}
      </div>
    );
  }

  return (
    <div className="h-[96px] w-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id="stakingDetailCurve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={curveColor} stopOpacity={0.22} />
              <stop offset="1" stopColor={curveColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['auto', 'auto']} />
          <ChartTooltip
            cursor={{
              stroke: 'var(--r-neutral-line)',
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
            content={(props) => (
              <CurveTooltip
                {...props}
                metric={metric}
                metricLabel={metricLabel}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={curveColor}
            fill="url(#stakingDetailCurve)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4.5,
              fill: 'var(--r-neutral-card1)',
              stroke: curveColor,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const MetricSwitch = ({
  metric,
  setMetric,
  pool,
}: {
  metric: StakingPoolCurveMetric;
  setMetric: (metric: StakingPoolCurveMetric) => void;
  pool: StakingPool;
}) => <MetricSwitchInner metric={metric} setMetric={setMetric} pool={pool} />;

const MetricSwitchInner = ({
  metric,
  setMetric,
  pool,
}: {
  metric: StakingPoolCurveMetric;
  setMetric: (metric: StakingPoolCurveMetric) => void;
  pool: StakingPool;
}) => {
  const { t } = useTranslation();

  return (
    <div className="staking-metric-switch">
      {(['tvl', 'apr'] as StakingPoolCurveMetric[]).map((item) => (
        <button
          key={item}
          type="button"
          className={clsx(
            'staking-metric-switch-item',
            metric === item && 'is-active'
          )}
          onClick={() => setMetric(item)}
        >
          {item === 'tvl' ? t('page.staking.metrics.tvl') : pool.metricLabel}
        </button>
      ))}
    </div>
  );
};

export const DetailSummary = ({
  pool,
  curve,
  curveLoading,
  metric,
  setMetric,
}: {
  pool: StakingPool;
  curve: StakingPoolCurvePoint[];
  curveLoading: boolean;
  metric: StakingPoolCurveMetric;
  setMetric: (metric: StakingPoolCurveMetric) => void;
}) => (
  <DetailSummaryInner
    pool={pool}
    curve={curve}
    curveLoading={curveLoading}
    metric={metric}
    setMetric={setMetric}
  />
);

const DetailSummaryInner = ({
  pool,
  curve,
  curveLoading,
  metric,
  setMetric,
}: {
  pool: StakingPool;
  curve: StakingPoolCurvePoint[];
  curveLoading: boolean;
  metric: StakingPoolCurveMetric;
  setMetric: (metric: StakingPoolCurveMetric) => void;
}) => {
  const { t } = useTranslation();
  const metricLabel = getMetricLabel(
    pool,
    metric,
    t('page.staking.metrics.tvl')
  );

  return (
    <div className="flex w-full flex-col gap-[16px] px-[20px] py-[10px]">
      <div className="flex items-center gap-[12px]">
        <TokenLogos
          tokens={pool.tokens.supplies}
          chainServerId={pool.chain_id}
          size="detail"
        />
        <div className="flex min-w-0 flex-col gap-[6px]">
          <div className="truncate text-[22px] leading-[20px] font-bold text-r-neutral-title1">
            {pool.display_name || pool.name || pool.id}
          </div>
          <DetailTags pool={pool} />
        </div>
      </div>

      <div className="flex w-full items-end justify-between">
        <div className="flex items-end gap-[8px]">
          <span className="text-[18px] leading-[20px] text-r-neutral-body">
            {getMetricText(pool, metric)}
          </span>
          <span className="text-[13px] leading-[16px] font-semibold text-r-neutral-foot">
            {metricLabel}
          </span>
        </div>
        <MetricSwitch metric={metric} setMetric={setMetric} pool={pool} />
      </div>

      <PoolCurve
        points={curve}
        loading={curveLoading}
        metric={metric}
        metricLabel={metricLabel}
      />
    </div>
  );
};
