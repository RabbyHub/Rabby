import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Empty, message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';

import { useRabbySelector } from '@/ui/store';

import { Erc4626ActionModal } from './components/Erc4626ActionModal';
import { LpActionModal } from './components/LpActionModal';
import { BackIcon } from './icons';
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
import { useStakingPositionSummary } from './hooks/useStakingPositionSummary';
import type { StakingPositionItem } from './hooks/useStakingPositionSummary';
import type { DetailTabKey, StakingAction } from './components/DetailSections';
import type { StakingPoolCurveMetric, StakingProtocol } from './types';
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
  const [localUniv3TokenIds, setLocalUniv3TokenIds] = useState<string[]>([]);
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

  const handleMintedUniv3TokenId = useCallback((tokenId: string) => {
    setLocalUniv3TokenIds((prev) =>
      prev.includes(tokenId) ? prev : [...prev, tokenId]
    );
  }, []);

  const { pendingActions, addPendingAction } = useStakingPendingActions({
    pool: visualPool,
    account,
    positionSummary,
    refreshDetailAsync,
    refreshCurveAsync,
    refreshPositionAsync,
    onMintedUniv3TokenId: handleMintedUniv3TokenId,
  });

  useEffect(() => {
    setLocalUniv3TokenIds([]);
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
            { key: 'portfolio' as const, label: 'Portfolio' },
            { key: 'about' as const, label: 'About' },
            { key: 'security' as const, label: 'Security' },
          ]
        : [
            { key: 'about' as const, label: 'About' },
            { key: 'security' as const, label: 'Security' },
          ],
    [shouldShowPortfolio]
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
      message.error('Failed to load staking pool');
    } else if (curveError) {
      message.error('Failed to load staking chart');
    }
  }, [curveError, detailError]);

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
              onSubmitted={({ hash }) => {
                addPendingAction({
                  hash,
                  action: lpAction.action,
                  positionId: lpAction.position?.id,
                  claimPositionIds: lpAction.claimPositions?.map(
                    (position) => position.id
                  ),
                });
                setLpAction(null);
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
