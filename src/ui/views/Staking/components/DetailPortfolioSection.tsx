import React from 'react';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { getSqrtRatioAtUniv3Tick } from '@rabby-wallet/staking-sdk';

import { SvgIcSuccess, SvgIcWarning } from '@/ui/assets';

import { ProtocolLogo, TokenLogos } from './PoolVisuals';
import { RewardsCardIcon, SuppliedCardIcon } from '../icons';
import type {
  StakingPositionAsset,
  StakingPositionItem,
  StakingPositionSummary,
} from '../hooks/useStakingPositionSummary';
import type {
  StakingPendingAction,
  StakingUniv3RangeBps,
} from '../hooks/useStakingPendingActions';
import type { StakingPool } from '../types';
import { formatStakingAmount, formatStakingUsd } from '../utils/format';
import { getActionSupported } from './DetailSectionUtils';
import type { StakingAction } from './DetailSectionUtils';

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

const PendingTokenIcon = ({
  token,
}: {
  token: StakingPositionAsset['token'];
}) => (
  <span className="staking-pending-token-icon">
    {token.logo_url ? (
      <img src={token.logo_url} alt={token.symbol || token.id} />
    ) : (
      <span>{(token.symbol || token.id || '?').slice(0, 1).toUpperCase()}</span>
    )}
  </span>
);

const PendingTokenGroup = ({
  tokens,
}: {
  tokens: StakingPositionAsset['token'][];
}) => {
  const visibleTokens = tokens.slice(0, 2);

  return (
    <span className="staking-pending-token-group">
      {visibleTokens.map((token, index) => (
        <React.Fragment key={`${token.chain_id || ''}-${token.id}-${index}`}>
          {index > 0 ? <span className="staking-pending-plus">+</span> : null}
          <span className="staking-pending-token">
            <PendingTokenIcon token={token} />
            <span>{token.symbol || token.id}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

const getPositiveAssets = (assets: StakingPositionAsset[]) =>
  assets.filter((asset) => new BigNumber(asset.rawAmount || 0).gt(0));

const getPendingActionTokens = ({
  pending,
  pool,
  summary,
}: {
  pending: StakingPendingAction;
  pool: StakingPool;
  summary?: StakingPositionSummary;
}) => {
  if (pending.displayTokens?.length) {
    return pending.displayTokens;
  }

  if (pending.action === 'claim') {
    const targetIds = pending.claimPositionIds?.length
      ? pending.claimPositionIds
      : pending.positionId
      ? [pending.positionId]
      : [];
    const targetPositions = targetIds.length
      ? (summary?.positions || []).filter((position) =>
          targetIds.includes(position.id)
        )
      : summary?.positions || [];
    const rewardTokens = getPositiveAssets(
      targetPositions.flatMap((position) => position.rewards)
    ).map((asset) => asset.token);

    return rewardTokens.length
      ? rewardTokens
      : pool.tokens.rewards.length
      ? pool.tokens.rewards
      : pool.tokens.supplies;
  }

  if (pending.action === 'withdraw') {
    const position = pending.positionId
      ? summary?.positions.find((item) => item.id === pending.positionId)
      : undefined;
    const suppliedTokens = getPositiveAssets(
      position?.supplied || summary?.supplied || []
    ).map((asset) => asset.token);

    return suppliedTokens.length ? suppliedTokens : pool.tokens.supplies;
  }

  return pool.tokens.supplies;
};

const PendingActionCard = ({
  pending,
  pool,
  summary,
}: {
  pending: StakingPendingAction;
  pool: StakingPool;
  summary?: StakingPositionSummary;
}) => {
  const { t } = useTranslation();
  const tokens = getPendingActionTokens({ pending, pool, summary });
  const isProtocolToWallet =
    pending.action === 'withdraw' || pending.action === 'claim';
  const tokenGroup = <PendingTokenGroup tokens={tokens} />;
  const protocol = <ProtocolLogo protocol={pool.protocol} size={20} />;
  const statusText =
    pending.status === 'succeed'
      ? t('page.staking.portfolio.succeed')
      : pending.status === 'failed'
      ? t('page.staking.portfolio.failed')
      : t('page.staking.portfolio.pending');

  return (
    <div className="staking-pending-card">
      <div className="staking-pending-flow">
        {isProtocolToWallet ? protocol : tokenGroup}
        <span className="staking-pending-arrow">&rarr;</span>
        {isProtocolToWallet ? tokenGroup : protocol}
      </div>
      <div className={clsx('staking-pending-status', `is-${pending.status}`)}>
        {pending.status === 'succeed' ? (
          <SvgIcSuccess className="staking-pending-status-icon" />
        ) : pending.status === 'failed' ? (
          <SvgIcWarning className="staking-pending-status-icon" />
        ) : (
          <span className="staking-pending-spinner" />
        )}
        <span>{statusText}</span>
      </div>
    </div>
  );
};

const PortfolioCardSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="staking-position-card">
      <div className="staking-position-title">
        {t('page.staking.portfolio.supplied')}
      </div>
      <div className="staking-position-rows">
        <div className="staking-position-skeleton-row" />
        <div className="staking-position-skeleton-row is-short" />
      </div>
    </div>
  );
};

const PortfolioCard = ({
  title,
  rows,
  pool,
  variant = 'supplied',
  emptyText,
  rangeText,
  children,
}: {
  title: string;
  rows: StakingPositionAsset[];
  pool: StakingPool;
  variant?: 'supplied' | 'rewards';
  emptyText: string;
  rangeText?: string;
  children?: React.ReactNode;
}) => {
  const CardIcon = variant === 'rewards' ? RewardsCardIcon : SuppliedCardIcon;

  return (
    <div className={clsx('staking-position-card', `is-${variant}`)}>
      <CardIcon
        className={clsx('staking-position-card-icon', `is-${variant}`)}
      />
      <div className="staking-position-heading">
        <div className="staking-position-title">{title}</div>
        {rangeText ? (
          <div className="staking-position-range">{rangeText}</div>
        ) : null}
      </div>
      <PortfolioRows rows={rows} pool={pool} emptyText={emptyText} />
      {children}
    </div>
  );
};

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

const formatPositionRangePercent = (value: BigNumber) => {
  if (!value.isFinite()) {
    return '';
  }

  const absValue = value.abs();
  const decimals = absValue.gte(100) ? 0 : absValue.gte(1) ? 1 : 2;
  const rounded = absValue
    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
    .toFixed(decimals)
    .replace(/\.0+$/, '');

  const sign = value.gt(0) ? '+' : value.lt(0) ? '-' : '';
  return `${sign}${rounded}%`;
};

const getSqrtPriceX96AsBigNumber = (value: string | bigint) =>
  new BigNumber(value.toString());

const getPositionRangeText = (
  position: StakingPositionItem,
  range: StakingUniv3RangeBps | undefined,
  t: TFunction
) => {
  if (range) {
    return `${t(
      'page.staking.portfolio.priceRange'
    )}: ${formatPositionRangePercent(
      new BigNumber(range.lowerBps).div(-100)
    )}~${formatPositionRangePercent(new BigNumber(range.upperBps).div(100))}`;
  }

  const raw = position.raw?.univ3;
  if (!raw) {
    return '';
  }

  try {
    const currentSqrtPrice = getSqrtPriceX96AsBigNumber(
      raw.poolState.sqrtPriceX96
    );
    if (!currentSqrtPrice.isFinite() || currentSqrtPrice.lte(0)) {
      return '';
    }

    const lowerSqrtPrice = getSqrtPriceX96AsBigNumber(
      getSqrtRatioAtUniv3Tick(raw.tickLower)
    );
    const upperSqrtPrice = getSqrtPriceX96AsBigNumber(
      getSqrtRatioAtUniv3Tick(raw.tickUpper)
    );
    const lowerPercent = lowerSqrtPrice
      .div(currentSqrtPrice)
      .pow(2)
      .minus(1)
      .multipliedBy(100);
    const upperPercent = upperSqrtPrice
      .div(currentSqrtPrice)
      .pow(2)
      .minus(1)
      .multipliedBy(100);

    const lowerText = formatPositionRangePercent(lowerPercent);
    const upperText = formatPositionRangePercent(upperPercent);
    return lowerText && upperText
      ? `${t('page.staking.portfolio.priceRange')}: ${lowerText}~${upperText}`
      : '';
  } catch {
    return '';
  }
};

const PortfolioPositionCard = ({
  pool,
  position,
  range,
  accountReady,
  onAction,
}: {
  pool: StakingPool;
  position: StakingPositionItem;
  range?: StakingUniv3RangeBps;
  accountReady: boolean;
  onAction: (action: StakingAction, position?: StakingPositionItem) => void;
}) => {
  const { t } = useTranslation();
  const depositDisabled = !accountReady || !getActionSupported(pool, 'deposit');
  const withdrawDisabled =
    !accountReady ||
    !position.supplied.length ||
    !getActionSupported(pool, 'withdraw');

  return (
    <PortfolioCard
      title={t('page.staking.portfolio.supplied')}
      rows={position.supplied}
      pool={pool}
      emptyText={t('page.staking.portfolio.noSuppliedAssets')}
      rangeText={getPositionRangeText(position, range, t)}
    >
      <div className="staking-position-actions">
        <InlineActionButton
          variant="primary"
          disabled={depositDisabled}
          onClick={() => onAction('deposit', position)}
        >
          {t('page.staking.actions.deposit')}
        </InlineActionButton>
        <InlineActionButton
          variant="secondary"
          disabled={withdrawDisabled}
          onClick={() => onAction('withdraw', position)}
        >
          {t('page.staking.actions.withdraw')}
        </InlineActionButton>
      </div>
    </PortfolioCard>
  );
};

const PortfolioRewardsCard = ({
  pool,
  positions,
  accountReady,
  showEmpty = false,
  onAction,
}: {
  pool: StakingPool;
  positions: StakingPositionItem[];
  accountReady: boolean;
  showEmpty?: boolean;
  onAction: (
    action: StakingAction,
    position?: StakingPositionItem,
    claimPositions?: StakingPositionItem[]
  ) => void;
}) => {
  const { t } = useTranslation();
  const rows = mergePositionAssets(positions.flatMap((item) => item.rewards));
  const claimDisabled =
    !accountReady || !rows.length || !getActionSupported(pool, 'claim');

  if (!rows.length && !showEmpty) {
    return null;
  }

  return (
    <PortfolioCard
      title={t('page.staking.portfolio.rewards')}
      rows={rows}
      pool={pool}
      variant="rewards"
      emptyText={t('page.staking.portfolio.noRewards')}
    >
      <div className="staking-position-actions">
        <InlineActionButton
          variant="secondary"
          disabled={claimDisabled}
          onClick={() => {
            const singlePosition =
              positions.length === 1 && positions[0]?.raw?.univ3
                ? positions[0]
                : undefined;
            onAction(
              'claim',
              singlePosition,
              singlePosition ? undefined : positions
            );
          }}
        >
          {t('page.staking.actions.claim')}
        </InlineActionButton>
      </div>
    </PortfolioCard>
  );
};

export const PortfolioTab = ({
  pool,
  accountReady,
  summary,
  loading,
  error,
  pendingActions,
  univ3PositionRanges,
  onAction,
}: {
  pool: StakingPool;
  accountReady: boolean;
  summary?: StakingPositionSummary;
  loading: boolean;
  error?: Error;
  pendingActions: StakingPendingAction[];
  univ3PositionRanges?: Record<string, StakingUniv3RangeBps>;
  onAction: (
    action: StakingAction,
    position?: StakingPositionItem,
    claimPositions?: StakingPositionItem[]
  ) => void;
}) => {
  const { t } = useTranslation();
  const depositDisabled = !accountReady || !getActionSupported(pool, 'deposit');
  const withdrawDisabled =
    !accountReady || !getActionSupported(pool, 'withdraw');
  const hasPortfolioContent =
    !!summary &&
    (summary.positions.length > 0 ||
      getPositiveAssets(summary.supplied).length > 0 ||
      getPositiveAssets(summary.rewards).length > 0);
  const hasActivePendingAction = pendingActions.some(
    (pending) => pending.status === 'pending'
  );
  const showPendingOnly = hasActivePendingAction && !hasPortfolioContent;

  if (loading && !summary && !pendingActions.length) {
    return (
      <div className="staking-position-panel">
        <PortfolioCardSkeleton />
      </div>
    );
  }

  return (
    <div className="staking-position-panel">
      {pendingActions.map((pending) => (
        <PendingActionCard
          key={pending.id}
          pending={pending}
          pool={pool}
          summary={summary}
        />
      ))}
      {showPendingOnly ? null : pool.type === 'univ3' ? (
        summary?.positions.length ? (
          <>
            {summary.positions.map((position) => (
              <React.Fragment key={position.id}>
                <PortfolioPositionCard
                  pool={pool}
                  position={position}
                  range={univ3PositionRanges?.[position.id]}
                  accountReady={accountReady}
                  onAction={onAction}
                />
                <PortfolioRewardsCard
                  pool={pool}
                  positions={[position]}
                  accountReady={accountReady}
                  showEmpty
                  onAction={onAction}
                />
              </React.Fragment>
            ))}
          </>
        ) : (
          <PortfolioCard
            title={t('page.staking.portfolio.supplied')}
            rows={summary?.supplied || []}
            pool={pool}
            emptyText={
              error
                ? t('page.staking.error.failedLoadPosition')
                : t('page.staking.portfolio.noSuppliedAssets')
            }
          >
            <div className="staking-position-actions">
              <InlineActionButton
                variant="primary"
                disabled={depositDisabled}
                onClick={() => onAction('deposit')}
              >
                {t('page.staking.actions.deposit')}
              </InlineActionButton>
              <InlineActionButton
                variant="secondary"
                disabled={withdrawDisabled || !summary?.positions.length}
                onClick={() => onAction('withdraw', summary?.positions[0])}
              >
                {t('page.staking.actions.withdraw')}
              </InlineActionButton>
            </div>
          </PortfolioCard>
        )
      ) : (
        <PortfolioCard
          title={t('page.staking.portfolio.supplied')}
          rows={summary?.supplied || []}
          pool={pool}
          emptyText={
            error
              ? t('page.staking.error.failedLoadPosition')
              : t('page.staking.portfolio.noSuppliedAssets')
          }
        >
          <div className="staking-position-actions">
            <InlineActionButton
              variant="primary"
              disabled={depositDisabled}
              onClick={() => onAction('deposit', summary?.positions[0])}
            >
              {t('page.staking.actions.deposit')}
            </InlineActionButton>
            <InlineActionButton
              variant="secondary"
              disabled={withdrawDisabled}
              onClick={() => onAction('withdraw', summary?.positions[0])}
            >
              {t('page.staking.actions.withdraw')}
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
