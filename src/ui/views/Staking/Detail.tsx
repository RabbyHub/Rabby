import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, message } from 'antd';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useHistory, useLocation } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  YAxis,
} from 'recharts';

import { openInTab } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import { getAddressScanLink } from '@/utils';
import { findChainByServerID } from '@/utils/chain';

import { Erc4626ActionModal } from './components/Erc4626ActionModal';
import { LpActionModal } from './components/LpActionModal';
import {
  PoolTypeTag,
  ProtocolIconChip,
  ProtocolLogo,
  TokenLogos,
} from './components/PoolVisuals';
import { useStakingFilters } from './hooks/useStakingFilters';
import { useStakingPoolCurve } from './hooks/useStakingPoolCurve';
import { useStakingPoolDetail } from './hooks/useStakingPoolDetail';
import { useStakingPositionSummary } from './hooks/useStakingPositionSummary';
import type {
  StakingPositionAsset,
  StakingPositionItem,
  StakingPositionSummary,
} from './hooks/useStakingPositionSummary';
import type {
  StakingLink,
  StakingPool,
  StakingPoolCurveMetric,
  StakingPoolCurvePoint,
  StakingProtocol,
  StakingToken,
} from './types';
import {
  formatStakingAmount,
  formatStakingNumber,
  formatStakingPercent,
  formatStakingUsd,
  shortenStakingAddress,
} from './utils/format';

type DetailTabKey = 'portfolio' | 'about' | 'security';
type Erc4626Action = 'deposit' | 'withdraw';
type StakingAction = Erc4626Action | 'claim';
type LpAction = 'deposit' | 'withdraw' | 'claim';

interface PendingLpAction {
  action: LpAction;
  position?: StakingPositionItem | null;
  claimPositions?: StakingPositionItem[];
}

const getPoolIdFromSearch = (search: string) => {
  const value = new URLSearchParams(search).get('pool_id');
  return value || undefined;
};

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M13.5 3L6.5 10L13.5 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M7.58 2.17h3.25v3.25M10.83 2.17 6.5 6.5"
      stroke="currentColor"
      strokeWidth="1.083"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.42 2.7H3.25A1.08 1.08 0 0 0 2.17 3.8v5.95c0 .6.48 1.08 1.08 1.08h5.96c.6 0 1.08-.48 1.08-1.08V7.58"
      stroke="currentColor"
      strokeWidth="1.083"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getPoolLinks = (pool: StakingPool) => {
  const links: StakingLink[] = [];

  if (pool.protocol.site_url) {
    links.push({
      type: 'website',
      name: 'Official Website',
      url: pool.protocol.site_url,
    });
  }

  if (pool.protocol.twitter_url) {
    links.push({
      type: 'twitter',
      name: 'X(Twitter)',
      url: pool.protocol.twitter_url,
    });
  }

  if (pool.protocol.about?.links?.length) {
    links.push(...pool.protocol.about.links);
  }

  const seen = new Set<string>();
  return links.filter((link) => {
    if (!link.url || seen.has(link.url)) {
      return false;
    }
    seen.add(link.url);
    return true;
  });
};

const getDisplayProtocol = (
  pool: StakingPool,
  protocolMap: Record<string, StakingProtocol>
): StakingProtocol => ({
  ...protocolMap[pool.protocol.id],
  ...pool.protocol,
  logo_url: pool.protocol.logo_url || protocolMap[pool.protocol.id]?.logo_url,
});

const getVisualPool = (
  pool: StakingPool,
  protocolMap: Record<string, StakingProtocol>
): StakingPool => ({
  ...pool,
  protocol: getDisplayProtocol(pool, protocolMap),
});

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

const getPrimaryToken = (pool: StakingPool) => pool.tokens.supplies[0];

const getTokenAddress = (token?: StakingToken) => token?.id || '-';

const isLpPool = (pool: StakingPool) =>
  pool.type === 'univ2' || pool.type === 'univ3';

const getUptime = (pool: StakingPool) => {
  if (!pool.create_at) {
    return '-';
  }

  const createAt =
    pool.create_at > 1000000000000
      ? dayjs(pool.create_at)
      : dayjs.unix(pool.create_at);
  const days = Math.max(dayjs().diff(createAt, 'day'), 0);
  return `${days} days`;
};

const getMetricText = (pool: StakingPool, metric: StakingPoolCurveMetric) =>
  metric === 'apr'
    ? formatStakingPercent(pool.apr)
    : formatStakingUsd(pool.tvl);

const getMetricLabel = (pool: StakingPool, metric: StakingPoolCurveMetric) =>
  metric === 'apr' ? pool.metricLabel : 'TVL';

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

const getActionSupported = (pool: StakingPool, action: StakingAction) =>
  pool.actions?.[action]?.is_supported === true;

const openPoolAddress = (pool: StakingPool) => {
  const chain = findChainByServerID(pool.chain_id);
  if (!chain?.scanLink || !pool.pool_address) {
    return;
  }
  openInTab(getAddressScanLink(chain.scanLink, pool.pool_address), false);
};

const openTokenAddress = (pool: StakingPool, token?: StakingToken) => {
  const chain = findChainByServerID(token?.chain_id || pool.chain_id);
  const address = getTokenAddress(token);
  if (!chain?.scanLink || !address || address === '-') {
    return;
  }
  openInTab(getAddressScanLink(chain.scanLink, address), false);
};

const AddressValue = ({
  value,
  onClick,
}: {
  value?: string | null;
  onClick?: () => void;
}) => (
  <button
    type="button"
    className="staking-link-value"
    disabled={!value || value === '-'}
    onClick={onClick}
  >
    <span>{shortenStakingAddress(value)}</span>
    {value && value !== '-' ? <ExternalIcon /> : null}
  </button>
);

const TokenInline = ({
  token,
  chainServerId,
}: {
  token?: StakingToken;
  chainServerId?: string;
}) => {
  if (!token) {
    return (
      <span className="text-[13px] leading-[20px] text-r-neutral-title1">
        -
      </span>
    );
  }

  return (
    <div className="flex items-center gap-[4px]">
      <TokenLogos tokens={[token]} chainServerId={chainServerId} size="mini" />
      <span className="text-[13px] leading-[20px] text-r-neutral-title1">
        {token.symbol || token.id}
      </span>
    </div>
  );
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
      : formatStakingUsd(value);
  const markerColor = metric === 'apr' ? '#2ABB7F' : 'var(--r-blue-default)';
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
  const curveColor = metric === 'apr' ? '#2ABB7F' : 'var(--r-blue-default)';
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
        No chart data
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
              stroke: curveColor,
              strokeWidth: 1,
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
              fill: curveColor,
              stroke: curveColor,
              strokeWidth: 0,
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
}) => (
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
        {item === 'tvl' ? 'TVL' : pool.metricLabel}
      </button>
    ))}
  </div>
);

const DetailSummary = ({
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
          {getMetricLabel(pool, metric)}
        </span>
      </div>
      <MetricSwitch metric={metric} setMetric={setMetric} pool={pool} />
    </div>

    <PoolCurve
      points={curve}
      loading={curveLoading}
      metric={metric}
      metricLabel={getMetricLabel(pool, metric)}
    />
  </div>
);

const FieldBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="text-[12px] leading-[14px] text-r-neutral-foot">
      {label}
    </div>
    <div className="mt-[2px] min-h-[20px]">{children}</div>
  </div>
);

const TokenAddressField = ({
  pool,
  token,
}: {
  pool: StakingPool;
  token?: StakingToken;
}) => (
  <AddressValue
    value={getTokenAddress(token)}
    onClick={() => openTokenAddress(pool, token)}
  />
);

const PoolInfoSection = ({ pool }: { pool: StakingPool }) => {
  const token1 = pool.tokens.supplies[0];
  const token2 = pool.tokens.supplies[1];
  const lpPool = isLpPool(pool);

  return (
    <section className="px-[20px]">
      <div className="mb-[16px] text-[15px] leading-[18px] font-bold text-r-neutral-black">
        Pool
      </div>
      <div className="grid grid-cols-2 gap-x-[48px] gap-y-[16px]">
        <FieldBlock label="Address">
          <AddressValue
            value={pool.pool_address}
            onClick={() => openPoolAddress(pool)}
          />
        </FieldBlock>
        <FieldBlock label="Uptime">
          <div className="text-[13px] leading-[20px] text-r-neutral-title1">
            {getUptime(pool)}
          </div>
        </FieldBlock>
        <FieldBlock label={lpPool ? 'Token1' : 'Token'}>
          <TokenInline token={token1} chainServerId={pool.chain_id} />
        </FieldBlock>
        <FieldBlock label={lpPool ? 'Token1 address' : 'Token address'}>
          <TokenAddressField pool={pool} token={token1} />
        </FieldBlock>
        {lpPool ? (
          <>
            <FieldBlock label="Token2">
              <TokenInline token={token2} chainServerId={pool.chain_id} />
            </FieldBlock>
            <FieldBlock label="Token2 address">
              <TokenAddressField pool={pool} token={token2} />
            </FieldBlock>
          </>
        ) : null}
      </div>
    </section>
  );
};

const AboutProtocolSection = ({ pool }: { pool: StakingPool }) => {
  const [expanded, setExpanded] = useState(false);
  const description = pool.protocol.about?.description;
  const links = useMemo(() => getPoolLinks(pool), [pool]);
  const protocolName = pool.protocol.name || pool.protocol.id || 'Protocol';
  const collapsed = !!description && description.length > 150 && !expanded;

  return (
    <section className="px-[20px]">
      <div className="mb-[16px] text-[15px] leading-[18px] font-bold text-r-neutral-black">
        About {protocolName}
      </div>
      <div
        className={clsx(
          'staking-about-desc text-[13px] leading-[20px] text-r-neutral-title1',
          collapsed && 'is-collapsed'
        )}
      >
        {description || 'No protocol description available.'}
      </div>
      {description && description.length > 150 ? (
        <button
          type="button"
          className="mt-[4px] text-[13px] leading-[16px] font-medium text-r-blue-default"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
      {links.length ? (
        <div className="mt-[16px] grid grid-cols-2 gap-[16px]">
          {links.slice(0, 2).map((link) => (
            <div key={`${link.type}-${link.url}`} className="min-w-0">
              <div className="text-[12px] leading-[14px] text-r-neutral-foot">
                {link.name || link.type}
              </div>
              <button
                type="button"
                className="mt-[4px] flex max-w-full items-end gap-[4px] text-r-neutral-title1"
                onClick={() => openInTab(link.url, false)}
              >
                <ProtocolLogo protocol={pool.protocol} size={16} />
                <span className="truncate text-[13px] leading-[16px]">
                  {link.type === 'twitter'
                    ? `@${protocolName}`
                    : link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </span>
                <span className="shrink-0 text-r-neutral-foot">
                  <ExternalIcon />
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const AboutTab = ({ pool }: { pool: StakingPool }) => (
  <div className="staking-about-tab">
    <PoolInfoSection pool={pool} />
    <div className="staking-about-divider" />
    <AboutProtocolSection pool={pool} />
  </div>
);

const SecurityTab = () => (
  <div className="px-[16px]">
    <div className="mb-[16px] flex items-center justify-between">
      <div className="text-[15px] leading-[18px] font-bold text-r-neutral-black">
        Certifications
      </div>
    </div>
    <div className="py-[42px] text-center text-[13px] leading-[18px] text-r-neutral-foot">
      No certification data
    </div>
  </div>
);

const PortfolioAssetRow = ({
  asset,
  pool,
}: {
  asset: StakingPositionAsset;
  pool: StakingPool;
}) => (
  <div className="staking-position-row">
    <div className="staking-position-row-main">
      <TokenLogos
        tokens={[asset.token]}
        chainServerId={asset.token.chain_id || pool.chain_id}
        size="mini"
      />
      <span className="staking-position-row-amount">
        {formatStakingAmount(asset.amount)}
      </span>
      <span className="truncate">{asset.token.symbol || asset.token.id}</span>
    </div>
    <span className="staking-position-row-value">
      {formatStakingUsd(asset.usdValue)}
    </span>
  </div>
);

const PortfolioRows = ({
  rows,
  pool,
  emptyText,
}: {
  rows: StakingPositionAsset[];
  pool: StakingPool;
  emptyText: string;
}) => {
  if (!rows.length) {
    return <div className="staking-position-empty">{emptyText}</div>;
  }

  return (
    <div className="staking-position-rows">
      {rows.map((asset) => (
        <PortfolioAssetRow
          key={`${asset.token.chain_id || pool.chain_id}-${asset.token.id}`}
          asset={asset}
          pool={pool}
        />
      ))}
    </div>
  );
};

const PortfolioCardSkeleton = () => (
  <div className="staking-position-card">
    <div className="staking-position-title">Supplied</div>
    <div className="staking-position-rows">
      <div className="staking-position-skeleton-row" />
      <div className="staking-position-skeleton-row is-short" />
    </div>
  </div>
);

const PortfolioCard = ({
  title,
  rows,
  pool,
  variant = 'supplied',
  emptyText,
  children,
}: {
  title: string;
  rows: StakingPositionAsset[];
  pool: StakingPool;
  variant?: 'supplied' | 'rewards';
  emptyText: string;
  children?: React.ReactNode;
}) => (
  <div className={clsx('staking-position-card', `is-${variant}`)}>
    <div className="staking-position-title">{title}</div>
    <PortfolioRows rows={rows} pool={pool} emptyText={emptyText} />
    {children}
  </div>
);

const InlineActionButton = ({
  children,
  variant,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={clsx('staking-inline-action', `is-${variant}`)}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

const hasRewards = (position: StakingPositionItem) =>
  position.rewards.some((asset) => new BigNumber(asset.rawAmount || 0).gt(0));

const mergePositionAssets = (assets: StakingPositionAsset[]) => {
  const merged = new Map<string, StakingPositionAsset>();

  assets.forEach((asset) => {
    const key = `${asset.token.chain_id || ''}-${asset.token.id}`.toLowerCase();
    const current = merged.get(key);
    if (!current) {
      merged.set(key, asset);
      return;
    }

    merged.set(key, {
      ...current,
      amount: new BigNumber(current.amount || 0)
        .plus(asset.amount || 0)
        .toString(),
      rawAmount: new BigNumber(current.rawAmount || 0)
        .plus(asset.rawAmount || 0)
        .toFixed(0),
      usdValue:
        current.usdValue === null && asset.usdValue === null
          ? null
          : new BigNumber(current.usdValue || 0)
              .plus(asset.usdValue || 0)
              .toNumber(),
    });
  });

  return Array.from(merged.values());
};

const PortfolioPositionCard = ({
  pool,
  position,
  accountReady,
  onAction,
}: {
  pool: StakingPool;
  position: StakingPositionItem;
  accountReady: boolean;
  onAction: (action: StakingAction, position?: StakingPositionItem) => void;
}) => {
  const depositDisabled = !accountReady || !getActionSupported(pool, 'deposit');
  const withdrawDisabled =
    !accountReady ||
    !position.supplied.length ||
    !getActionSupported(pool, 'withdraw');

  return (
    <PortfolioCard
      title="Supplied"
      rows={position.supplied}
      pool={pool}
      emptyText="No supplied assets"
    >
      <div className="staking-position-actions">
        <InlineActionButton
          variant="primary"
          disabled={depositDisabled}
          onClick={() => onAction('deposit', position)}
        >
          Deposit
        </InlineActionButton>
        <InlineActionButton
          variant="secondary"
          disabled={withdrawDisabled}
          onClick={() => onAction('withdraw', position)}
        >
          Withdraw
        </InlineActionButton>
      </div>
    </PortfolioCard>
  );
};

const PortfolioRewardsCard = ({
  pool,
  positions,
  accountReady,
  onAction,
}: {
  pool: StakingPool;
  positions: StakingPositionItem[];
  accountReady: boolean;
  onAction: (
    action: StakingAction,
    position?: StakingPositionItem,
    claimPositions?: StakingPositionItem[]
  ) => void;
}) => {
  const rows = mergePositionAssets(positions.flatMap((item) => item.rewards));
  const claimDisabled =
    !accountReady || !rows.length || !getActionSupported(pool, 'claim');

  if (!rows.length) {
    return null;
  }

  return (
    <PortfolioCard
      title="Rewards"
      rows={rows}
      pool={pool}
      variant="rewards"
      emptyText="No rewards"
    >
      <div className="staking-position-actions">
        <InlineActionButton
          variant="secondary"
          disabled={claimDisabled}
          onClick={() => onAction('claim', undefined, positions)}
        >
          Claim
        </InlineActionButton>
      </div>
    </PortfolioCard>
  );
};

const PortfolioTab = ({
  pool,
  accountReady,
  summary,
  loading,
  error,
  onAction,
}: {
  pool: StakingPool;
  accountReady: boolean;
  summary?: StakingPositionSummary;
  loading: boolean;
  error?: Error;
  onAction: (
    action: StakingAction,
    position?: StakingPositionItem,
    claimPositions?: StakingPositionItem[]
  ) => void;
}) => {
  const depositDisabled = !accountReady || !getActionSupported(pool, 'deposit');
  const withdrawDisabled =
    !accountReady || !getActionSupported(pool, 'withdraw');

  if (loading && !summary) {
    return (
      <div className="staking-position-panel">
        <PortfolioCardSkeleton />
      </div>
    );
  }

  return (
    <div className="staking-position-panel">
      {pool.type === 'univ3' && summary?.positions.length ? (
        <>
          {summary.positions.map((position) => (
            <PortfolioPositionCard
              key={position.id}
              pool={pool}
              position={position}
              accountReady={accountReady}
              onAction={onAction}
            />
          ))}
          <PortfolioRewardsCard
            pool={pool}
            positions={summary.positions.filter(hasRewards)}
            accountReady={accountReady}
            onAction={onAction}
          />
        </>
      ) : (
        <PortfolioCard
          title="Supplied"
          rows={summary?.supplied || []}
          pool={pool}
          emptyText={error ? 'Failed to load position' : 'No supplied assets'}
        >
          <div className="staking-position-actions">
            <InlineActionButton
              variant="primary"
              disabled={depositDisabled}
              onClick={() => onAction('deposit', summary?.positions[0])}
            >
              Deposit
            </InlineActionButton>
            <InlineActionButton
              variant="secondary"
              disabled={withdrawDisabled}
              onClick={() => onAction('withdraw', summary?.positions[0])}
            >
              Withdraw
            </InlineActionButton>
          </div>
        </PortfolioCard>
      )}
      {pool.type !== 'univ3' && summary?.rewards.length ? (
        <PortfolioRewardsCard
          pool={pool}
          positions={
            summary.positions.length
              ? summary.positions
              : [
                  {
                    id: 'rewards',
                    type: pool.type,
                    supplied: [],
                    rewards: summary.rewards,
                  },
                ]
          }
          accountReady={accountReady}
          onAction={onAction}
        />
      ) : null}
    </div>
  );
};

const DetailTabs = ({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: DetailTabKey;
  tabs: Array<{ key: DetailTabKey; label: string }>;
  onChange: (key: DetailTabKey) => void;
}) => (
  <div className={clsx('staking-tabs', tabs.length === 3 && 'is-three')}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        className={clsx(
          'staking-tab-item',
          activeTab === tab.key && 'is-active'
        )}
        onClick={() => onChange(tab.key)}
      >
        {tab.label}
        {activeTab === tab.key ? <span className="staking-tab-line" /> : null}
      </button>
    ))}
  </div>
);

const BottomActionBar = ({
  disabled,
  onClick,
  showDivider,
  actionRef,
}: {
  disabled?: boolean;
  onClick: () => void;
  showDivider?: boolean;
  actionRef?: React.Ref<HTMLDivElement>;
}) => (
  <div
    ref={actionRef}
    className={clsx('staking-bottom-action', showDivider && 'has-divider')}
  >
    <button
      type="button"
      className="staking-primary-action"
      disabled={disabled}
      onClick={onClick}
    >
      Deposit
    </button>
  </div>
);

const StakingDetail = () => {
  const history = useHistory();
  const location = useLocation();
  const account = useRabbySelector((state) => state.account.currentAccount);
  const pageRef = useRef<HTMLDivElement>(null);
  const bottomActionAnchorRef = useRef<HTMLDivElement>(null);
  const bottomActionRef = useRef<HTMLDivElement>(null);
  const [showBottomActionDivider, setShowBottomActionDivider] = useState(false);
  const poolId = useMemo(() => getPoolIdFromSearch(location.search), [
    location.search,
  ]);
  const [metric, setMetric] = useState<StakingPoolCurveMetric>('tvl');
  const [activeTab, setActiveTab] = useState<DetailTabKey>('about');
  const [erc4626Action, setErc4626Action] = useState<Erc4626Action | null>(
    null
  );
  const [lpAction, setLpAction] = useState<PendingLpAction | null>(null);
  const { data: filters } = useStakingFilters();
  const {
    data: pool,
    loading: detailLoading,
    error: detailError,
    refresh: refreshDetail,
  } = useStakingPoolDetail(poolId);
  const {
    data: curve = [],
    loading: curveLoading,
    error: curveError,
    refresh: refreshCurve,
  } = useStakingPoolCurve(poolId, metric);

  const protocolMap = useMemo(
    () =>
      (filters?.protocols || []).reduce<Record<string, StakingProtocol>>(
        (result, protocol) => {
          result[protocol.id] = protocol;
          return result;
        },
        {}
      ),
    [filters?.protocols]
  );

  const visualPool = useMemo(
    () => (pool ? getVisualPool(pool, protocolMap) : undefined),
    [pool, protocolMap]
  );
  const {
    data: positionSummary,
    loading: positionLoading,
    error: positionError,
    refresh: refreshPosition,
  } = useStakingPositionSummary(visualPool, account);

  const tabs = useMemo(
    () =>
      visualPool?.is_holding
        ? [
            { key: 'portfolio' as const, label: 'Portfolio' },
            { key: 'about' as const, label: 'About' },
            { key: 'security' as const, label: 'Security' },
          ]
        : [
            { key: 'about' as const, label: 'About' },
            { key: 'security' as const, label: 'Security' },
          ],
    [visualPool?.is_holding]
  );
  const displayedTab = tabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : tabs[0]?.key || 'about';

  useEffect(() => {
    if (visualPool) {
      setActiveTab(visualPool.is_holding ? 'portfolio' : 'about');
    }
  }, [visualPool?.id, visualPool?.is_holding]);

  useEffect(() => {
    if (detailError) {
      message.error('Failed to load staking pool');
    } else if (curveError) {
      message.error('Failed to load staking chart');
    }
  }, [curveError, detailError]);

  useEffect(() => {
    if (!visualPool || visualPool.is_holding) {
      setShowBottomActionDivider(false);
      return;
    }

    let frame = 0;
    const updateDivider = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const anchor = bottomActionAnchorRef.current;
        const actionBar = bottomActionRef.current;
        if (!anchor || !actionBar) {
          setShowBottomActionDivider(false);
          return;
        }

        const anchorTop = anchor.getBoundingClientRect().top;
        const actionTop = actionBar.getBoundingClientRect().top;
        const next = anchorTop > actionTop + 1;
        setShowBottomActionDivider((prev) => (prev === next ? prev : next));
      });
    };

    updateDivider();
    window.addEventListener('resize', updateDivider);
    window.addEventListener('scroll', updateDivider, true);

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateDivider);
    if (resizeObserver) {
      if (bottomActionAnchorRef.current) {
        resizeObserver.observe(bottomActionAnchorRef.current);
      }
      if (bottomActionRef.current) {
        resizeObserver.observe(bottomActionRef.current);
      }
      if (pageRef.current) {
        resizeObserver.observe(pageRef.current);
      }
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateDivider);
      window.removeEventListener('scroll', updateDivider, true);
      resizeObserver?.disconnect();
    };
  }, [
    activeTab,
    curve.length,
    curveLoading,
    detailLoading,
    displayedTab,
    positionLoading,
    positionSummary,
    visualPool,
  ]);

  const refresh = () => {
    refreshDetail();
    refreshCurve();
    refreshPosition();
  };

  const handleAction = (
    action: StakingAction,
    position?: StakingPositionItem,
    claimPositions?: StakingPositionItem[]
  ) => {
    if (!visualPool) {
      return;
    }

    if (visualPool.type === 'erc4626' && action !== 'claim') {
      setErc4626Action(action);
      return;
    }

    if (visualPool.type === 'univ2' || visualPool.type === 'univ3') {
      setLpAction({
        action,
        position,
        claimPositions,
      });
      return;
    }

    message.info('Unsupported staking action.');
  };

  const actionDisabled =
    !account || !visualPool || !getActionSupported(visualPool, 'deposit');

  return (
    <div
      ref={pageRef}
      className="staking-detail-page min-h-screen bg-r-neutral-bg1 text-r-neutral-title1"
    >
      <style>
        {`
          .staking-detail-page .staking-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 18px;
            padding: 2px 4px;
            border: 0.5px solid var(--r-neutral-line);
            border-radius: 4px;
            background: transparent;
            color: var(--r-neutral-foot);
            font-size: 12px;
            line-height: 14px;
            font-weight: 400;
            white-space: nowrap;
          }

          .staking-detail-page .staking-chip-icon {
            width: 22px;
            padding: 2px 4px;
          }

          .staking-detail-page .staking-chip-detail {
            height: 18px;
            font-size: 12px;
            line-height: 14px;
            font-weight: 400;
          }

          .staking-detail-page .staking-metric-switch {
            display: inline-flex;
            align-items: center;
            height: 24px;
            padding: 2px 3px;
            border-radius: 4px;
            background: var(--r-neutral-bg2);
          }

          .staking-detail-page .staking-metric-switch-item {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 20px;
            min-width: 41px;
            padding: 2px 8px;
            border: 0;
            border-radius: 4px;
            color: var(--r-neutral-foot);
            background: transparent;
            font-size: 13px;
            line-height: 16px;
          }

          .staking-detail-page .staking-metric-switch-item.is-active {
            color: var(--r-neutral-title1);
            background: var(--r-neutral-card1);
            font-weight: 500;
          }

          .staking-detail-page .staking-chart-skeleton,
          .staking-detail-page .staking-chart-empty {
            width: 360px;
            height: 96px;
            border-radius: 8px;
            background: var(--r-neutral-bg2);
          }

          .staking-detail-page .staking-chart-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
          }

          .staking-detail-page .staking-chart-tooltip {
            min-width: 110px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border: 0.5px solid var(--r-neutral-line);
            border-radius: 8px;
            padding: 8px;
            background: var(--r-neutral-card1);
            color: var(--r-neutral-body);
            box-shadow: 0 0 2px rgba(0, 0, 0, 0.1);
            font-size: 12px;
            line-height: 14px;
            font-weight: 400;
          }

          .staking-detail-page .staking-chart-tooltip-date {
            color: var(--r-neutral-foot);
            white-space: nowrap;
          }

          .staking-detail-page .staking-chart-tooltip-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            white-space: nowrap;
          }

          .staking-detail-page .staking-chart-tooltip-label {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .staking-detail-page .staking-chart-tooltip-marker {
            width: 11px;
            height: 11px;
            border-radius: 4px;
            flex-shrink: 0;
          }

          .staking-detail-page .staking-tabs {
            display: flex;
            width: 100%;
            height: 40px;
            border-bottom: 0.5px solid var(--r-neutral-line);
          }

          .staking-detail-page .staking-tab-item {
            position: relative;
            flex: 1 1 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 0;
            background: transparent;
            color: var(--r-neutral-foot);
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }

          .staking-detail-page .staking-tab-item.is-active {
            color: var(--r-blue-default);
            font-weight: 600;
          }

          .staking-detail-page .staking-tab-line {
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 133px;
            height: 2px;
            transform: translateX(-50%);
            border-radius: 1px;
            background: var(--r-blue-default);
          }

          .staking-detail-page .staking-tabs.is-three .staking-tab-line {
            width: 100%;
          }

          .staking-detail-page .staking-link-value {
            display: inline-flex;
            max-width: 100%;
            align-items: center;
            gap: 4px;
            border: 0;
            background: transparent;
            color: var(--r-neutral-title1);
            font-size: 13px;
            line-height: 20px;
            padding: 0;
          }

          .staking-detail-page .staking-link-value:disabled {
            color: var(--r-neutral-title1);
          }

          .staking-detail-page .staking-about-desc.is-collapsed {
            max-height: 60px;
            overflow: hidden;
          }

          .staking-detail-page .staking-about-tab {
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding-bottom: 41px;
          }

          .staking-detail-page .staking-about-divider {
            width: 360px;
            height: 1px;
            margin: 0 20px;
            background: var(--r-neutral-line);
            opacity: 0.5;
          }

          .staking-detail-page .staking-position-panel {
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding: 0 16px 41px;
          }

          .staking-detail-page .staking-position-card {
            position: relative;
            width: 368px;
            border: 0.5px solid var(--r-blue-light1);
            border-radius: 16px;
            padding: 20px 16px;
            background: linear-gradient(101deg, rgba(237, 240, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) 100%);
          }

          .staking-detail-page .staking-position-card::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 16px;
            width: 40px;
            height: 32px;
            border-radius: 999px;
            border: 3px solid rgba(76, 101, 255, 0.08);
            box-shadow: inset 9px 0 0 rgba(255, 255, 255, 0.6);
            pointer-events: none;
          }

          .staking-detail-page .staking-position-card.is-rewards {
            border-color: rgba(135, 105, 12, 0.1);
            background: rgba(255, 245, 226, 0.2);
          }

          .staking-detail-page .staking-position-card.is-rewards::after {
            border-color: rgba(135, 105, 12, 0.08);
          }

          .staking-detail-page .staking-position-title {
            color: var(--r-neutral-black);
            font-size: 15px;
            line-height: 18px;
            font-weight: 700;
          }

          .staking-detail-page .staking-position-card.is-rewards .staking-position-title {
            color: #87690c;
          }

          .staking-detail-page .staking-position-rows {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 16px;
          }

          .staking-detail-page .staking-position-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 336px;
            min-height: 20px;
            color: var(--r-neutral-title1);
            font-size: 15px;
            line-height: 20px;
            font-weight: 400;
          }

          .staking-detail-page .staking-position-row-main {
            display: flex;
            min-width: 0;
            flex: 1 1 0;
            align-items: center;
            gap: 4px;
          }

          .staking-detail-page .staking-position-row-amount {
            margin-left: 0;
            white-space: nowrap;
          }

          .staking-detail-page .staking-position-row-value {
            flex: 1 1 0;
            text-align: right;
            white-space: nowrap;
          }

          .staking-detail-page .staking-position-empty {
            margin-top: 16px;
            color: var(--r-neutral-foot);
            font-size: 13px;
            line-height: 20px;
          }

          .staking-detail-page .staking-position-skeleton-row {
            width: 336px;
            height: 20px;
            border-radius: 6px;
            background: var(--r-neutral-bg2);
          }

          .staking-detail-page .staking-position-skeleton-row.is-short {
            width: 240px;
          }

          .staking-detail-page .staking-position-actions {
            display: flex;
            gap: 10px;
            width: 336px;
            margin-top: 32px;
          }

          .staking-detail-page .staking-position-card.is-rewards .staking-position-actions {
            margin-top: 16px;
          }

          .staking-detail-page .staking-inline-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 1 1 0;
            height: 36px;
            border-radius: 8px;
            border: 1px solid var(--r-blue-default);
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
            color: var(--r-blue-default);
            background: transparent;
          }

          .staking-detail-page .staking-primary-action {
            color: var(--r-neutral-title2);
            background: var(--r-blue-default);
          }

          .staking-detail-page .staking-inline-action:disabled,
          .staking-detail-page .staking-primary-action:disabled {
            opacity: 0.5;
          }

          .staking-detail-page .staking-bottom-action {
            position: sticky;
            bottom: 0;
            z-index: 2;
            width: 400px;
            padding: 20px;
            border-top: 1px solid transparent;
            background: var(--r-neutral-bg1);
          }

          .staking-detail-page .staking-bottom-action.has-divider {
            border-top-color: var(--r-neutral-line);
          }

          .staking-detail-page .staking-primary-action {
            display: flex;
            width: 352px;
            height: 44px;
            align-items: center;
            justify-content: center;
            border: 0;
            border-radius: 8px;
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }
        `}
      </style>

      <div className="relative h-[60px]">
        <div className="absolute left-[20px] top-[20px]">
          <Button
            type="text"
            className="w-[20px] h-[20px] p-0 flex items-center justify-center text-r-neutral-title1"
            icon={<BackIcon />}
            onClick={() => history.goBack()}
          />
        </div>
        <div className="absolute left-1/2 top-[18px] -translate-x-1/2 text-[20px] leading-[24px] font-medium text-r-neutral-title1">
          Staking
        </div>
      </div>

      {detailLoading && !visualPool ? (
        <div className="px-[20px] py-[10px]">
          <div className="h-[44px] w-[180px] rounded-[8px] bg-r-neutral-bg2" />
          <div className="mt-[16px] h-[24px] w-full rounded-[8px] bg-r-neutral-bg2" />
          <div className="mt-[16px] h-[96px] w-[360px] rounded-[8px] bg-r-neutral-bg2" />
        </div>
      ) : visualPool ? (
        <>
          <DetailSummary
            pool={visualPool}
            curve={curve}
            curveLoading={curveLoading}
            metric={metric}
            setMetric={setMetric}
          />

          <div className="mt-[0px] bg-r-neutral-bg1">
            <DetailTabs
              tabs={tabs}
              activeTab={displayedTab}
              onChange={setActiveTab}
            />
            <div className="pt-[20px]">
              {displayedTab === 'portfolio' ? (
                <PortfolioTab
                  pool={visualPool}
                  accountReady={!!account}
                  summary={positionSummary}
                  loading={positionLoading}
                  error={positionError}
                  onAction={handleAction}
                />
              ) : null}
              {displayedTab === 'about' ? <AboutTab pool={visualPool} /> : null}
              {displayedTab === 'security' ? <SecurityTab /> : null}
            </div>
          </div>

          {!visualPool.is_holding ? (
            <>
              <div ref={bottomActionAnchorRef} />
              <BottomActionBar
                actionRef={bottomActionRef}
                disabled={actionDisabled}
                showDivider={showBottomActionDivider}
                onClick={() => handleAction('deposit')}
              />
            </>
          ) : null}

          {account && erc4626Action ? (
            <Erc4626ActionModal
              visible={!!erc4626Action}
              action={erc4626Action}
              pool={visualPool}
              account={account}
              onCancel={() => setErc4626Action(null)}
              onSubmitted={() => {
                setErc4626Action(null);
              }}
              onConfirmed={refresh}
            />
          ) : null}

          {account && lpAction ? (
            <LpActionModal
              visible={!!lpAction}
              action={lpAction.action}
              pool={visualPool}
              account={account}
              position={lpAction.position}
              claimPositions={lpAction.claimPositions}
              onCancel={() => setLpAction(null)}
              onSubmitted={() => {
                setLpAction(null);
                refresh();
              }}
            />
          ) : null}
        </>
      ) : detailError ? (
        <div className="pt-[56px] flex flex-col items-center">
          <Empty description="Failed to load staking pool" />
          <Button className="mt-[12px]" onClick={refreshDetail}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="pt-[56px]">
          <Empty description="Staking pool not found" />
        </div>
      )}
    </div>
  );
};

export default StakingDetail;
