import { useCallback, useEffect, useRef, useState } from 'react';

import type { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';

import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionSummary } from './useStakingPositionSummary';
import { waitForStakingTxReceipt } from '../utils/tx';
import type { StakingTxReceipt } from '../utils/tx';

export type StakingPendingActionKind = 'deposit' | 'withdraw' | 'claim';
export type StakingPendingActionStatus = 'pending' | 'succeed' | 'failed';

export interface StakingUniv3RangeBps {
  lowerBps: number;
  upperBps: number;
}

export interface StakingPendingAction {
  id: string;
  hash: string;
  action: StakingPendingActionKind;
  status: StakingPendingActionStatus;
  poolId: string;
  poolType: StakingPool['type'];
  positionId?: string;
  claimPositionIds?: string[];
  univ3Range?: StakingUniv3RangeBps;
  displayTokens?: StakingToken[];
  submittedAt: number;
  baseline: StakingPositionSnapshot;
}

export interface AddStakingPendingActionPayload {
  hash: string;
  action: StakingPendingActionKind;
  positionId?: string;
  claimPositionIds?: string[];
  univ3Range?: StakingUniv3RangeBps;
}

interface StakingPositionSnapshot {
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

const ZERO_ADDRESS_TOPIC =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const DATA_REFRESH_INTERVAL = 3000;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeAddressTopic = (address: string) =>
  `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`;

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

const getPositiveAssets = <T extends { rawAmount?: string }>(assets: T[]) =>
  assets.filter((asset) => safeBigInt(asset.rawAmount) > 0n);

const getPendingActionDisplayTokens = ({
  action,
  pool,
  positionId,
  claimPositionIds,
  summary,
}: {
  action: StakingPendingActionKind;
  pool: StakingPool;
  positionId?: string;
  claimPositionIds?: string[];
  summary?: StakingPositionSummary;
}) => {
  if (action === 'claim') {
    const targetIds = claimPositionIds?.length
      ? claimPositionIds
      : positionId
      ? [positionId]
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

  if (action === 'withdraw') {
    const position = positionId
      ? summary?.positions.find((item) => item.id === positionId)
      : undefined;
    const suppliedTokens = getPositiveAssets(
      position?.supplied || summary?.supplied || []
    ).map((asset) => asset.token);

    return suppliedTokens.length ? suppliedTokens : pool.tokens.supplies;
  }

  return pool.tokens.supplies;
};

const createSnapshot = (
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

const getPendingClaimPositionIds = (pending: StakingPendingAction) =>
  pending.claimPositionIds?.length
    ? pending.claimPositionIds
    : pending.positionId
    ? [pending.positionId]
    : [];

const hasClaimTargetsUpdated = (
  pending: StakingPendingAction,
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

const hasPendingResolved = (
  pending: StakingPendingAction,
  summary?: StakingPositionSummary
) => {
  const next = createSnapshot(summary);

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

const getMintedUniv3TokenId = (
  receipt: StakingTxReceipt | null,
  accountAddress: string
) => {
  const toTopic = normalizeAddressTopic(accountAddress);
  const logs = Array.isArray(receipt?.logs) ? receipt?.logs : [];

  for (const log of logs) {
    const topics = Array.isArray((log as { topics?: string[] }).topics)
      ? ((log as { topics?: string[] }).topics as string[])
      : [];
    if (
      topics[0]?.toLowerCase() === ERC721_TRANSFER_TOPIC &&
      topics[1]?.toLowerCase() === ZERO_ADDRESS_TOPIC &&
      topics[2]?.toLowerCase() === toTopic &&
      topics[3]
    ) {
      return BigInt(topics[3]).toString();
    }
  }

  return '';
};

export const useStakingPendingActions = ({
  pool,
  account,
  positionSummary,
  refreshDetailAsync,
  refreshCurveAsync,
  refreshPositionAsync,
  onMintedUniv3TokenId,
}: {
  pool?: StakingPool;
  account?: Account | null;
  positionSummary?: StakingPositionSummary;
  refreshDetailAsync: () => Promise<StakingPool | undefined>;
  refreshCurveAsync?: () => Promise<unknown>;
  refreshPositionAsync: () => Promise<StakingPositionSummary | undefined>;
  onMintedUniv3TokenId: (tokenId: string, range?: StakingUniv3RangeBps) => void;
}) => {
  const wallet = useWallet();
  const [pendingActions, setPendingActions] = useState<StakingPendingAction[]>(
    []
  );
  const processingRef = useRef(new Set<string>());
  const mountedRef = useRef(true);
  const pendingActionsRef = useRef(pendingActions);
  const positionSummaryRef = useRef(positionSummary);
  const refreshDetailAsyncRef = useRef(refreshDetailAsync);
  const refreshCurveAsyncRef = useRef(refreshCurveAsync);
  const refreshPositionAsyncRef = useRef(refreshPositionAsync);
  const onMintedUniv3TokenIdRef = useRef(onMintedUniv3TokenId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    pendingActionsRef.current = pendingActions;
  }, [pendingActions]);

  useEffect(() => {
    positionSummaryRef.current = positionSummary;
  }, [positionSummary]);

  useEffect(() => {
    refreshDetailAsyncRef.current = refreshDetailAsync;
  }, [refreshDetailAsync]);

  useEffect(() => {
    refreshCurveAsyncRef.current = refreshCurveAsync;
  }, [refreshCurveAsync]);

  useEffect(() => {
    refreshPositionAsyncRef.current = refreshPositionAsync;
  }, [refreshPositionAsync]);

  useEffect(() => {
    onMintedUniv3TokenIdRef.current = onMintedUniv3TokenId;
  }, [onMintedUniv3TokenId]);

  useEffect(() => {
    setPendingActions([]);
    processingRef.current.clear();
  }, [account?.address, pool?.id]);

  const updatePendingActionStatus = useCallback(
    (id: string, status: StakingPendingActionStatus) => {
      setPendingActions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    },
    []
  );

  const addPendingAction = useCallback(
    (payload: AddStakingPendingActionPayload) => {
      if (!pool || !payload.hash) {
        return;
      }

      setPendingActions((prev) => {
        if (prev.some((item) => item.hash === payload.hash)) {
          return prev;
        }

        return [
          {
            id: `${payload.hash}-${Date.now()}`,
            hash: payload.hash,
            action: payload.action,
            status: 'pending',
            poolId: pool.id,
            poolType: pool.type,
            positionId: payload.positionId,
            claimPositionIds: payload.claimPositionIds,
            univ3Range: payload.univ3Range,
            displayTokens: getPendingActionDisplayTokens({
              action: payload.action,
              pool,
              positionId: payload.positionId,
              claimPositionIds: payload.claimPositionIds,
              summary: positionSummaryRef.current,
            }),
            submittedAt: Date.now(),
            baseline: createSnapshot(positionSummaryRef.current),
          },
          ...prev,
        ];
      });
    },
    [pool]
  );

  const isPendingActionPending = useCallback((id: string) => {
    return pendingActionsRef.current.some(
      (item) => item.id === id && item.status === 'pending'
    );
  }, []);

  const processPendingAction = useCallback(
    async (pending: StakingPendingAction) => {
      if (!pool || !account) {
        return;
      }

      try {
        let receipt = await waitForStakingTxReceipt({
          wallet,
          chainServerId: pool.chain_id,
          account,
          hash: pending.hash,
          attempts: 120,
          interval: 3000,
        });

        if (!mountedRef.current || !isPendingActionPending(pending.id)) {
          return;
        }

        while (
          !receipt &&
          mountedRef.current &&
          isPendingActionPending(pending.id)
        ) {
          await wait(DATA_REFRESH_INTERVAL);
          receipt = await waitForStakingTxReceipt({
            wallet,
            chainServerId: pool.chain_id,
            account,
            hash: pending.hash,
            attempts: 1,
            interval: 0,
          });
        }

        if (
          pending.action === 'deposit' &&
          pending.poolType === 'univ3' &&
          !pending.positionId
        ) {
          const mintedTokenId = getMintedUniv3TokenId(receipt, account.address);
          if (mintedTokenId) {
            onMintedUniv3TokenIdRef.current(mintedTokenId, pending.univ3Range);
            await wait(0);
          }
        }

        while (mountedRef.current && isPendingActionPending(pending.id)) {
          const [, , nextSummary] = await Promise.all([
            refreshDetailAsyncRef.current().catch(() => undefined),
            refreshCurveAsyncRef.current?.().catch(() => undefined),
            refreshPositionAsyncRef.current().catch(() => undefined),
          ]);

          const latestSummary = nextSummary || positionSummaryRef.current;
          if (hasPendingResolved(pending, latestSummary)) {
            updatePendingActionStatus(pending.id, 'succeed');
            return;
          }

          await wait(DATA_REFRESH_INTERVAL);
        }
      } catch (error) {
        if (mountedRef.current) {
          console.error('staking pending action error', error);
          updatePendingActionStatus(pending.id, 'failed');
        }
      } finally {
        processingRef.current.delete(pending.id);
      }
    },
    [account, isPendingActionPending, pool, updatePendingActionStatus, wallet]
  );

  useEffect(() => {
    pendingActions.forEach((pending) => {
      if (pending.status !== 'pending') {
        return;
      }
      if (processingRef.current.has(pending.id)) {
        return;
      }
      processingRef.current.add(pending.id);
      processPendingAction(pending);
    });
  }, [pendingActions, processPendingAction]);

  return {
    pendingActions,
    addPendingAction,
  };
};
