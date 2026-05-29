import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { UNIV3_NPM_ABI } from '@rabby-wallet/staking-sdk';

import type { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';

import type { StakingPool, StakingToken } from '../types';
import type { StakingPositionSummary } from './useStakingPositionSummary';
import { readStakingContract, waitForStakingTxReceipt } from '../utils/tx';
import type { StakingTxReceipt } from '../utils/tx';
import {
  createStakingPositionSnapshot,
  hasStakingPendingResolved,
} from '../utils/pendingResolution';
import type { StakingPositionSnapshot } from '../utils/pendingResolution';
import {
  getBurnedUniv3TokenId,
  getMintedUniv3TokenId,
  isUniv3OwnerQueryForNonexistentTokenError,
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
  expectedBurnTokenId?: string;
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
  expectedBurnTokenId?: string;
  univ3Range?: StakingUniv3RangeBps;
}

const DATA_REFRESH_INTERVAL = 3000;
const STAKING_PENDING_ACTIONS_STORAGE_PREFIX = 'rabby-staking-pending-actions';

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isStakingPositionSnapshot = (
  value: unknown
): value is StakingPositionSnapshot =>
  isPlainRecord(value) &&
  typeof value.positionsCount === 'number' &&
  Array.isArray(value.positionIds) &&
  isPlainRecord(value.suppliedByToken) &&
  isPlainRecord(value.rewardsByToken) &&
  isPlainRecord(value.univ3Positions);

const isStoredPendingAction = (
  value: unknown,
  poolId?: string,
  poolType?: StakingPool['type']
): value is StakingPendingAction => {
  if (!poolId || !poolType || !isPlainRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.hash === 'string' &&
    (value.action === 'deposit' ||
      value.action === 'withdraw' ||
      value.action === 'claim') &&
    value.status === 'pending' &&
    value.poolId === poolId &&
    value.poolType === poolType &&
    typeof value.submittedAt === 'number' &&
    isStakingPositionSnapshot(value.baseline)
  );
};

const getStakingPendingActionsStorageKey = (
  accountAddress?: string,
  pool?: StakingPool
) => {
  if (!accountAddress || !pool?.id) {
    return '';
  }

  return [
    STAKING_PENDING_ACTIONS_STORAGE_PREFIX,
    accountAddress.toLowerCase(),
    pool.chain_id,
    pool.id,
  ].join(':');
};

const readStakingPendingActionsFromStorage = (
  storageKey: string,
  poolId?: string,
  poolType?: StakingPool['type']
): StakingPendingAction[] => {
  if (!storageKey || !poolId || !poolType || typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(storageKey);
      return [];
    }

    return parsed.filter((item) =>
      isStoredPendingAction(item, poolId, poolType)
    );
  } catch {
    return [];
  }
};

const writeStakingPendingActionsToStorage = (
  storageKey: string,
  pendingActions: StakingPendingAction[]
) => {
  if (!storageKey || typeof window === 'undefined') {
    return;
  }

  try {
    const pendingOnly = pendingActions.filter(
      (pending) => pending.status === 'pending'
    );
    if (!pendingOnly.length) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(pendingOnly));
  } catch {
    // Ignore storage quota/security errors; the in-memory banner still works.
  }
};

const safeBigInt = (value?: string | number | bigint | null) => {
  try {
    return BigInt(value || 0);
  } catch {
    return 0n;
  }
};

const getPositiveAssets = <T extends { rawAmount?: string }>(assets: T[]) =>
  assets.filter((asset) => safeBigInt(asset.rawAmount) > 0n);

const getReceiptToAddress = (receipt: StakingTxReceipt | null) => {
  const to = typeof receipt?.to === 'string' ? receipt.to : '';
  return /^0x[0-9a-fA-F]{40}$/.test(to) ? (to as `0x${string}`) : undefined;
};

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
  const isRestoringPendingActionsRef = useRef(false);
  const pendingActionsRef = useRef(pendingActions);
  const positionSummaryRef = useRef(positionSummary);
  const refreshDetailAsyncRef = useRef(refreshDetailAsync);
  const refreshCurveAsyncRef = useRef(refreshCurveAsync);
  const refreshPositionAsyncRef = useRef(refreshPositionAsync);
  const onMintedUniv3TokenIdRef = useRef(onMintedUniv3TokenId);
  const pendingStorageKey = getStakingPendingActionsStorageKey(
    account?.address,
    pool
  );

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

  useLayoutEffect(() => {
    processingRef.current.clear();
    isRestoringPendingActionsRef.current = true;
    setPendingActions(
      readStakingPendingActionsFromStorage(
        pendingStorageKey,
        pool?.id,
        pool?.type
      )
    );
  }, [pendingStorageKey, pool?.id, pool?.type]);

  useLayoutEffect(() => {
    if (isRestoringPendingActionsRef.current) {
      isRestoringPendingActionsRef.current = false;
      return;
    }

    writeStakingPendingActionsToStorage(pendingStorageKey, pendingActions);
  }, [pendingActions, pendingStorageKey]);

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
            expectedBurnTokenId: payload.expectedBurnTokenId,
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

  const refreshStakingData = useCallback(() => {
    const tasks = [
      () => refreshDetailAsyncRef.current(),
      () => refreshCurveAsyncRef.current?.(),
      () => refreshPositionAsyncRef.current(),
    ];

    void Promise.allSettled(tasks.map((task) => Promise.resolve().then(task)));
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

        const expectedBurnTokenId =
          pending.action === 'withdraw' && pending.poolType === 'univ3'
            ? pending.expectedBurnTokenId
            : undefined;

        if (expectedBurnTokenId) {
          while (mountedRef.current && isPendingActionPending(pending.id)) {
            const burnedUniv3TokenId = getBurnedUniv3TokenId({
              receipt,
              accountAddress: account.address,
              tokenId: expectedBurnTokenId,
            });

            if (burnedUniv3TokenId) {
              updatePendingActionStatus(pending.id, 'succeed');
              refreshStakingData();
              return;
            }

            const receiptTo = getReceiptToAddress(receipt);
            if (receiptTo) {
              try {
                await readStakingContract({
                  wallet,
                  chainServerId: pool.chain_id,
                  account,
                  address: receiptTo,
                  abi: UNIV3_NPM_ABI,
                  functionName: 'ownerOf',
                  args: [BigInt(expectedBurnTokenId)],
                });
              } catch (error) {
                if (isUniv3OwnerQueryForNonexistentTokenError(error)) {
                  if (
                    !mountedRef.current ||
                    !isPendingActionPending(pending.id)
                  ) {
                    return;
                  }

                  updatePendingActionStatus(pending.id, 'succeed');
                  refreshStakingData();
                  return;
                }
              }
            }

            await wait(DATA_REFRESH_INTERVAL);
            receipt =
              (await waitForStakingTxReceipt({
                wallet,
                chainServerId: pool.chain_id,
                account,
                hash: pending.hash,
                attempts: 1,
                interval: 0,
              })) || receipt;
          }

          return;
        }

        while (mountedRef.current && isPendingActionPending(pending.id)) {
          const nextSummary = await refreshPositionAsyncRef
            .current()
            .catch(() => undefined);
          void Promise.allSettled([
            Promise.resolve().then(() => refreshDetailAsyncRef.current()),
            Promise.resolve().then(() => refreshCurveAsyncRef.current?.()),
          ]);

          const latestSummary = nextSummary || positionSummaryRef.current;
          if (hasStakingPendingResolved(pending, latestSummary)) {
            updatePendingActionStatus(pending.id, 'succeed');
            refreshStakingData();
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
    [
      account,
      isPendingActionPending,
      pool,
      refreshStakingData,
      updatePendingActionStatus,
      wallet,
    ]
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
