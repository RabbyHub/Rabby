import React from 'react';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';

import { TokenLogos } from './PoolVisuals';
import type {
  StakingPositionAsset,
  StakingPositionItem,
  StakingPositionSummary,
} from '../hooks/useStakingPositionSummary';
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

const PortfolioNewPositionCard = ({
  pool,
  accountReady,
  onAction,
}: {
  pool: StakingPool;
  accountReady: boolean;
  onAction: (action: StakingAction, position?: StakingPositionItem) => void;
}) => {
  const depositDisabled = !accountReady || !getActionSupported(pool, 'deposit');

  return (
    <div className="staking-position-new-card">
      <div className="staking-position-new-title">New Position</div>
      <InlineActionButton
        variant="primary"
        disabled={depositDisabled}
        onClick={() => onAction('deposit')}
      >
        Deposit
      </InlineActionButton>
    </div>
  );
};

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

export const PortfolioTab = ({
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
          <PortfolioNewPositionCard
            pool={pool}
            accountReady={accountReady}
            onAction={onAction}
          />
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
