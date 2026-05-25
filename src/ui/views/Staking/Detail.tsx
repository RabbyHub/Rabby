import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Empty, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import type { Hex } from 'viem';

import {
  buildUniv3CollectTx,
  encodeUniv3Collect,
  encodeUniv3Multicall,
  resolveUniv3PoolEntryWithClient,
} from '@rabby-wallet/staking-sdk';
import type {
  StakingPool as SdkStakingPool,
  StakingTxBuildResult,
  Univ3PoolKey,
} from '@rabby-wallet/staking-sdk';

import { PageHeader } from '@/ui/component';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

import { Erc4626ActionModal } from './components/Erc4626ActionModal';
import { LpActionModal } from './components/LpActionModal';
import {
  AboutTab,
  BottomActionBar,
  DetailSummary,
  DetailTabs,
  PortfolioTab,
  SecurityTab,
  getActionSupported,
  getVisualPool,
} from './components/DetailSections';
import { useStakingFilters } from './hooks/useStakingFilters';
import { useStakingPoolCurve } from './hooks/useStakingPoolCurve';
import { useStakingPoolDetail } from './hooks/useStakingPoolDetail';
import { useStakingPendingActions } from './hooks/useStakingPendingActions';
import type { StakingUniv3RangeBps } from './hooks/useStakingPendingActions';
import { useStakingPositionSummary } from './hooks/useStakingPositionSummary';
import type { StakingPositionItem } from './hooks/useStakingPositionSummary';
import type { DetailTabKey, StakingAction } from './components/DetailSections';
import type {
  StakingPool,
  StakingPoolCurveMetric,
  StakingProtocol,
} from './types';
import { useStakingMiniSign } from './hooks/useStakingMiniSign';
import { normalizeStakingPoolToPoolKey } from './utils/poolKey';
import {
  buildStakingMiniSignTxs,
  createStakingReadContractClient,
  getStakingMainTxHash,
} from './utils/tx';
import './style.less';

type Erc4626Action = 'deposit' | 'withdraw';
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

const toSdkPool = (pool: StakingPool) => (pool as unknown) as SdkStakingPool;

const StakingDetail = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const wallet = useWallet();
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
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [localUniv3TokenIds, setLocalUniv3TokenIds] = useState<string[]>([]);
  const [localUniv3Ranges, setLocalUniv3Ranges] = useState<
    Record<string, StakingUniv3RangeBps>
  >({});
  const { data: filters } = useStakingFilters();
  const {
    data: pool,
    loading: detailLoading,
    error: detailError,
    refresh: refreshDetail,
    refreshAsync: refreshDetailAsync,
  } = useStakingPoolDetail(poolId);
  const {
    data: curve = [],
    loading: curveLoading,
    error: curveError,
    refreshAsync: refreshCurveAsync,
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
    refreshAsync: refreshPositionAsync,
  } = useStakingPositionSummary(visualPool, account, localUniv3TokenIds);

  const handleMintedUniv3TokenId = useCallback(
    (tokenId: string, range?: StakingUniv3RangeBps) => {
      setLocalUniv3TokenIds((prev) =>
        prev.includes(tokenId) ? prev : [...prev, tokenId]
      );
      if (range) {
        setLocalUniv3Ranges((prev) => ({
          ...prev,
          [tokenId]: range,
        }));
      }
    },
    []
  );

  const { pendingActions, addPendingAction } = useStakingPendingActions({
    pool: visualPool,
    account,
    positionSummary,
    refreshDetailAsync,
    refreshCurveAsync,
    refreshPositionAsync,
    onMintedUniv3TokenId: handleMintedUniv3TokenId,
  });
  const { sign: signClaim } = useStakingMiniSign({
    account,
    chainServerId: visualPool?.chain_id || 'eth',
  });

  useEffect(() => {
    setLocalUniv3TokenIds([]);
    setLocalUniv3Ranges({});
  }, [account?.address, poolId]);

  const hasPortfolioData = useMemo(() => {
    if (!positionSummary) {
      return false;
    }
    return (
      positionSummary.positions.length > 0 ||
      positionSummary.supplied.some(
        (asset) => BigInt(asset.rawAmount || '0') > 0n
      ) ||
      positionSummary.rewards.some(
        (asset) => BigInt(asset.rawAmount || '0') > 0n
      )
    );
  }, [positionSummary]);

  const shouldShowPortfolio =
    !!visualPool?.is_holding || pendingActions.length > 0 || hasPortfolioData;

  const tabs = useMemo(
    () =>
      shouldShowPortfolio
        ? [
            {
              key: 'portfolio' as const,
              label: t('page.staking.tabs.portfolio'),
            },
            { key: 'about' as const, label: t('page.staking.tabs.about') },
            {
              key: 'security' as const,
              label: t('page.staking.tabs.security'),
            },
          ]
        : [
            { key: 'about' as const, label: t('page.staking.tabs.about') },
            {
              key: 'security' as const,
              label: t('page.staking.tabs.security'),
            },
          ],
    [shouldShowPortfolio, t]
  );
  const displayedTab = tabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : tabs[0]?.key || 'about';

  useEffect(() => {
    if (visualPool) {
      setActiveTab(shouldShowPortfolio ? 'portfolio' : 'about');
    }
  }, [shouldShowPortfolio, visualPool?.id]);

  useEffect(() => {
    if (detailError) {
      message.error(t('page.staking.error.failedLoadPool'));
    } else if (curveError) {
      message.error(t('page.staking.error.failedLoadChart'));
    }
  }, [curveError, detailError, t]);

  useEffect(() => {
    if (!visualPool || shouldShowPortfolio) {
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
    shouldShowPortfolio,
    visualPool,
  ]);

  const handleDirectClaim = useCallback(
    async (
      position?: StakingPositionItem,
      claimPositions?: StakingPositionItem[]
    ) => {
      if (
        !account ||
        !visualPool ||
        visualPool.type !== 'univ3' ||
        claimSubmitting
      ) {
        return;
      }

      const claimTargets = position?.raw?.univ3
        ? [position]
        : (claimPositions || []).filter((item) => item.raw?.univ3);
      if (!claimTargets.length) {
        message.error(t('page.staking.actionModal.noClaimableRewards'));
        return;
      }

      try {
        setClaimSubmitting(true);
        const chainInfo = findChainByServerID(visualPool.chain_id);
        if (!chainInfo) {
          throw new Error(t('page.staking.actionModal.unsupportedChain'));
        }

        const client = createStakingReadContractClient({
          wallet,
          chainServerId: visualPool.chain_id,
          account,
        });
        const key = normalizeStakingPoolToPoolKey(visualPool) as Univ3PoolKey;
        const univ3Entry = await resolveUniv3PoolEntryWithClient({
          key,
          client,
        });
        const common = {
          pool: toSdkPool(visualPool),
          from: account.address,
          receiver: account.address,
          evmChainId: chainInfo.id,
          addressBook: [univ3Entry],
        };
        let buildResult: StakingTxBuildResult;

        if (claimTargets.length === 1) {
          const raw = claimTargets[0].raw!.univ3!;
          buildResult = buildUniv3CollectTx({
            ...common,
            tokenId: raw.tokenId,
            position: {
              token0: raw.token0,
              token1: raw.token1,
              fee: raw.fee,
            },
          });
        } else {
          const calls = claimTargets.map((item) =>
            encodeUniv3Collect({
              tokenId: item.raw!.univ3!.tokenId,
              receiver: account.address,
            })
          );
          buildResult = {
            tx: {
              from: account.address as `0x${string}`,
              to: univ3Entry.nonfungiblePositionManager,
              data: encodeUniv3Multicall(calls as Hex[]),
              value: '0x0',
              chainId: chainInfo.id,
            },
            meta: {
              poolId: visualPool.id,
              chainId: visualPool.chain_id,
              type: visualPool.type,
              protocolId: visualPool.protocol.id,
              addressVerification: univ3Entry.verification,
            },
          };
        }

        const { txs } = await buildStakingMiniSignTxs({
          wallet,
          chainServerId: visualPool.chain_id,
          evmChainId: chainInfo.id,
          account,
          buildResult,
        });
        const hashes = await signClaim({
          txs,
          trigger: t('page.staking.actions.claim'),
          logo: visualPool.protocol.logo_url,
        });
        const hash = getStakingMainTxHash(hashes);

        if (hash) {
          addPendingAction({
            hash,
            action: 'claim',
            positionId: position?.id,
            claimPositionIds: position
              ? undefined
              : claimTargets.map((item) => item.id),
          });
        }
      } catch (error) {
        if (
          error === MINI_SIGN_ERROR.USER_CANCELLED ||
          error === MINI_SIGN_ERROR.CANT_PROCESS
        ) {
          return;
        }
        console.error('staking claim action error', error);
        message.error(
          t('page.staking.actionModal.submitFailed', {
            action: t('page.staking.actions.claim').toLowerCase(),
          })
        );
      } finally {
        setClaimSubmitting(false);
      }
    },
    [
      account,
      addPendingAction,
      claimSubmitting,
      signClaim,
      t,
      visualPool,
      wallet,
    ]
  );

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
      if (visualPool.type === 'univ3' && action === 'claim') {
        handleDirectClaim(position, claimPositions);
        return;
      }

      setLpAction({
        action,
        position,
        claimPositions,
      });
      return;
    }

    message.info(t('page.staking.detail.unsupportedAction'));
  };

  const actionDisabled =
    !account || !visualPool || !getActionSupported(visualPool, 'deposit');

  return (
    <div
      ref={pageRef}
      className="staking-detail-page min-h-screen bg-r-neutral-bg1 text-r-neutral-title1"
    >
      <PageHeader
        fixed
        contentClassName="staking-page-header"
        wrapperClassName="staking-page-header-wrap"
        forceShowBack
        isShowAccount
        disableSwitchAccount
      >
        {t('page.staking.title')}
      </PageHeader>

      {detailLoading && !visualPool ? (
        <div className="px-[20px] py-[10px]">
          <div className="staking-detail-loading-skeleton h-[44px] w-[180px] rounded-[8px]" />
          <div className="staking-detail-loading-skeleton mt-[16px] h-[24px] w-full rounded-[8px]" />
          <div className="staking-detail-loading-skeleton mt-[16px] h-[96px] w-[360px] rounded-[8px]" />
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
                  pendingActions={pendingActions}
                  univ3PositionRanges={localUniv3Ranges}
                  onAction={handleAction}
                />
              ) : null}
              {displayedTab === 'about' ? <AboutTab pool={visualPool} /> : null}
              {displayedTab === 'security' ? (
                <SecurityTab pool={visualPool} />
              ) : null}
            </div>
          </div>

          {!shouldShowPortfolio ? (
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
              onSubmitted={({ hash }) => {
                addPendingAction({
                  hash,
                  action: erc4626Action,
                });
                setErc4626Action(null);
              }}
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
              onSubmitted={({ hash, univ3Range }) => {
                addPendingAction({
                  hash,
                  action: lpAction.action,
                  positionId: lpAction.position?.id,
                  claimPositionIds: lpAction.claimPositions?.map(
                    (position) => position.id
                  ),
                  univ3Range,
                });
                setLpAction(null);
              }}
            />
          ) : null}
        </>
      ) : detailError ? (
        <div className="pt-[56px] flex flex-col items-center">
          <Empty description={t('page.staking.error.failedLoadPool')} />
          <Button className="mt-[12px]" onClick={refreshDetail}>
            {t('page.staking.actions.retry')}
          </Button>
        </div>
      ) : (
        <div className="pt-[56px]">
          <Empty description={t('page.staking.detail.poolNotFound')} />
        </div>
      )}
    </div>
  );
};

export default StakingDetail;
