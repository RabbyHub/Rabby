import { useCallback, useEffect, useRef, useState } from 'react';

import type { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';

import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionSummary } from './useStakingPositionSummary';
import { waitForStakingTxReceipt } from '../utils/tx';
import {
  createStakingPositionSnapshot,
  hasStakingPendingResolved,
} from '../utils/pendingResolution';
import type { StakingPositionSnapshot } from '../utils/pendingResolution';
import {
  getBurnedUniv3TokenId,
  getMintedUniv3TokenId,
} from '../utils/univ3NftReceipt';

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

const DATA_REFRESH_INTERVAL = 3000;

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const safeBigInt = (value?: string | number | bigint | null) => {
  try {
    return BigInt(value || 0);
  } catch {
    return 0n;
  }
};

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
            baseline: createStakingPositionSnapshot(positionSummaryRef.current),
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

        const burnedUniv3TokenId =
          pending.action === 'withdraw' && pending.poolType === 'univ3'
            ? getBurnedUniv3TokenId({
                receipt,
                accountAddress: account.address,
              })
            : '';

        if (burnedUniv3TokenId) {
          await Promise.all([
            refreshDetailAsyncRef.current().catch(() => undefined),
            refreshCurveAsyncRef.current?.().catch(() => undefined),
            refreshPositionAsyncRef.current().catch(() => undefined),
          ]);

          if (!mountedRef.current || !isPendingActionPending(pending.id)) {
            return;
          }

          updatePendingActionStatus(pending.id, 'succeed');
          return;
        }

        while (mountedRef.current && isPendingActionPending(pending.id)) {
          const [, , nextSummary] = await Promise.all([
            refreshDetailAsyncRef.current().catch(() => undefined),
            refreshCurveAsyncRef.current?.().catch(() => undefined),
            refreshPositionAsyncRef.current().catch(() => undefined),
          ]);

          const latestSummary = nextSummary || positionSummaryRef.current;
          if (hasStakingPendingResolved(pending, latestSummary)) {
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
