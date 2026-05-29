import type { StakingPool } from '../types';
import type { StakingPositionSummary } from '../hooks/useStakingPositionSummary';

export interface StakingPositionSnapshot {
  positionsCount: number;
  positionIds: string[];
  suppliedByToken: Record<string, string>;
  rewardsByToken: Record<string, string>;
  univ3Positions: Record<
    string,
    {
      liquidity: string;
      tokensOwed0: string;
      tokensOwed1: string;
    }
  >;
}

interface PendingActionLike {
  action: 'deposit' | 'withdraw' | 'claim';
  poolType: StakingPool['type'];
  positionId?: string;
  claimPositionIds?: string[];
  baseline: StakingPositionSnapshot;
}

const safeBigInt = (value?: string | number | bigint | null) => {
  try {
    return BigInt(value || 0);
  } catch {
    return 0n;
  }
};

const addRecordValue = (
  record: Record<string, string>,
  key: string,
  value?: string | bigint
) => {
  if (!key) {
    return;
  }
  record[key] = (safeBigInt(record[key]) + safeBigInt(value)).toString();
};

const getAssetKey = (asset: { token: { chain_id?: string; id: string } }) =>
  `${asset.token.chain_id || ''}-${asset.token.id}`.toLowerCase();

export const createStakingPositionSnapshot = (
  summary?: StakingPositionSummary
): StakingPositionSnapshot => {
  const suppliedByToken: Record<string, string> = {};
  const rewardsByToken: Record<string, string> = {};
  const univ3Positions: StakingPositionSnapshot['univ3Positions'] = {};

  (summary?.supplied || []).forEach((asset) => {
    addRecordValue(suppliedByToken, getAssetKey(asset), asset.rawAmount);
  });
  (summary?.rewards || []).forEach((asset) => {
    addRecordValue(rewardsByToken, getAssetKey(asset), asset.rawAmount);
  });
  (summary?.positions || []).forEach((position) => {
    const raw = position.raw?.univ3;
    if (!raw) {
      return;
    }
    univ3Positions[position.id] = {
      liquidity: raw.liquidity,
      tokensOwed0: raw.claimable0,
      tokensOwed1: raw.claimable1,
    };
  });

  return {
    positionsCount: summary?.positionsCount || 0,
    positionIds: (summary?.positions || []).map((position) => position.id),
    suppliedByToken,
    rewardsByToken,
    univ3Positions,
  };
};

const hasAnyGreaterValue = (
  next: Record<string, string>,
  baseline: Record<string, string>
) =>
  Array.from(new Set([...Object.keys(next), ...Object.keys(baseline)])).some(
    (key) => safeBigInt(next[key]) > safeBigInt(baseline[key])
  );

const hasAnyLowerValue = (
  next: Record<string, string>,
  baseline: Record<string, string>
) =>
  Array.from(new Set([...Object.keys(next), ...Object.keys(baseline)])).some(
    (key) => safeBigInt(next[key]) < safeBigInt(baseline[key])
  );

const getPendingClaimPositionIds = (pending: PendingActionLike) =>
  pending.claimPositionIds?.length
    ? pending.claimPositionIds
    : pending.positionId
    ? [pending.positionId]
    : [];

const hasClaimTargetsUpdated = (
  pending: PendingActionLike,
  next: StakingPositionSnapshot
) => {
  const targetIds = getPendingClaimPositionIds(pending);
  if (!targetIds.length) {
    return hasAnyLowerValue(
      next.rewardsByToken,
      pending.baseline.rewardsByToken
    );
  }

  return targetIds.some((id) => {
    const baseline = pending.baseline.univ3Positions[id];
    if (!baseline) {
      return false;
    }
    const current = next.univ3Positions[id];
    if (!current) {
      return true;
    }
    const baselineOwed =
      safeBigInt(baseline.tokensOwed0) + safeBigInt(baseline.tokensOwed1);
    const currentOwed =
      safeBigInt(current.tokensOwed0) + safeBigInt(current.tokensOwed1);
    return currentOwed < baselineOwed;
  });
};

export const hasStakingPendingResolved = (
  pending: PendingActionLike,
  summary?: StakingPositionSummary
) => {
  const next = createStakingPositionSnapshot(summary);

  if (pending.action === 'deposit') {
    if (pending.poolType === 'univ3') {
      if (pending.positionId) {
        const baseline = pending.baseline.univ3Positions[pending.positionId];
        const current = next.univ3Positions[pending.positionId];
        return (
          !!baseline &&
          !!current &&
          safeBigInt(current.liquidity) > safeBigInt(baseline.liquidity)
        );
      }

      const hasNewPosition = next.positionIds.some(
        (id) =>
          !pending.baseline.positionIds.includes(id) &&
          safeBigInt(next.univ3Positions[id]?.liquidity) > 0n
      );
      return (
        hasNewPosition ||
        hasAnyGreaterValue(
          next.suppliedByToken,
          pending.baseline.suppliedByToken
        )
      );
    }

    return hasAnyGreaterValue(
      next.suppliedByToken,
      pending.baseline.suppliedByToken
    );
  }

  if (pending.action === 'withdraw') {
    if (pending.poolType === 'univ3' && pending.positionId) {
      const baseline = pending.baseline.univ3Positions[pending.positionId];
      const current = next.univ3Positions[pending.positionId];
      if (baseline) {
        return (
          !current ||
          safeBigInt(current.liquidity) < safeBigInt(baseline.liquidity) ||
          next.positionsCount < pending.baseline.positionsCount ||
          hasAnyLowerValue(
            next.suppliedByToken,
            pending.baseline.suppliedByToken
          )
        );
      }

      return (
        next.positionsCount < pending.baseline.positionsCount ||
        hasAnyLowerValue(next.suppliedByToken, pending.baseline.suppliedByToken)
      );
    }

    return (
      next.positionsCount < pending.baseline.positionsCount ||
      hasAnyLowerValue(next.suppliedByToken, pending.baseline.suppliedByToken)
    );
  }

  return hasClaimTargetsUpdated(pending, next);
};
