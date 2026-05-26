import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Input, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

import { PageHeader } from '@/ui/component';
import { useDebouncedValue } from '@/ui/hooks/useDebounceValue';
import { useRabbySelector } from '@/ui/store';

import { SearchIcon } from './icons';
import {
  ChainLogo,
  ChainSelectorPopup,
  ProtocolSelectorPopup,
  ProtocolLogo,
  StakingEmpty,
  StakingFilterTrigger,
  StakingPoolCard,
  StakingSkeleton,
  getDisplayChain,
  getDisplayProtocol,
} from './components/ListSections';
import { useStakingFilters } from './hooks/useStakingFilters';
import { useStakingPools } from './hooks/useStakingPools';
import type { StakingFilterItem, StakingProtocol } from './types';
import './style.less';

const PAGE_LIMIT = 50;
type StakingRouteState = {
  stakingMyHoldingOnly?: boolean;
};
type StakingQueryState = {
  search: string;
  chainId?: string;
  protocolId?: string;
  myHoldingOnly: boolean;
};

const STAKING_QUERY_KEYS = {
  search: 'q',
  chainId: 'chain_id',
  protocolId: 'protocol_id',
  myHoldingOnly: 'holding_only',
} as const;

const isQueryEnabled = (value: string | null) =>
  value === '1' || value === 'true';

const getStakingQueryState = (
  search: string,
  routeState?: StakingRouteState
): StakingQueryState => {
  const params = new URLSearchParams(search);
  const holdingParam = params.get(STAKING_QUERY_KEYS.myHoldingOnly);

  return {
    search: params.get(STAKING_QUERY_KEYS.search) || '',
    chainId: params.get(STAKING_QUERY_KEYS.chainId) || undefined,
    protocolId: params.get(STAKING_QUERY_KEYS.protocolId) || undefined,
    myHoldingOnly:
      holdingParam === null
        ? !!routeState?.stakingMyHoldingOnly
        : isQueryEnabled(holdingParam),
  };
};

const setNullableQueryParam = (
  params: URLSearchParams,
  key: string,
  value?: string
) => {
  const normalized = value?.trim();
  if (normalized) {
    params.set(key, normalized);
  } else {
    params.delete(key);
  }
};

const Staking = () => {
  const { t } = useTranslation();
  const history = useHistory<StakingRouteState | undefined>();
  const account = useRabbySelector((state) => state.account.currentAccount);
  const initialQueryStateRef = useRef<StakingQueryState>();
  if (!initialQueryStateRef.current) {
    initialQueryStateRef.current = getStakingQueryState(
      history.location.search,
      history.location.state
    );
  }
  const initialQueryState = initialQueryStateRef.current!;
  const [search, setSearch] = useState(initialQueryState.search);
  const [chainId, setChainId] = useState<string | undefined>(
    initialQueryState.chainId
  );
  const [protocolId, setProtocolId] = useState<string | undefined>(
    initialQueryState.protocolId
  );
  const [protocolSelectorVisible, setProtocolSelectorVisible] = useState(false);
  const [chainSelectorVisible, setChainSelectorVisible] = useState(false);
  const [myHoldingOnly, setMyHoldingOnly] = useState<boolean>(
    initialQueryState.myHoldingOnly
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: filters,
    loading: filtersLoading,
    error: filtersError,
  } = useStakingFilters();
  const {
    data: poolList,
    loading: poolsLoading,
    error: poolsError,
    refresh: refreshPools,
  } = useStakingPools({
    q: debouncedSearch,
    chainId,
    protocolId,
    myHoldingOnly,
    start: 0,
    limit: PAGE_LIMIT,
  });

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

  const chainMap = useMemo(
    () =>
      (filters?.chains || []).reduce<Record<string, StakingFilterItem>>(
        (result, filterChain) => {
          result[filterChain.id] = filterChain;
          return result;
        },
        {}
      ),
    [filters?.chains]
  );

  const pools = poolList?.pools || [];
  const protocolHoldingMap = useMemo(
    () =>
      pools.reduce<Record<string, boolean>>((result, pool) => {
        if (pool.is_holding) {
          result[pool.protocol.id] = true;
        }
        return result;
      }, {}),
    [pools]
  );
  const selectedProtocol = protocolId
    ? protocolMap[protocolId] || { id: protocolId }
    : undefined;
  const selectedChain = chainId
    ? getDisplayChain(chainMap[chainId] || { id: chainId })
    : undefined;
  const initialLoading = poolsLoading && !poolList && !poolsError;
  const hasActiveFilter = !!chainId || !!protocolId;

  useEffect(() => {
    if (filtersError || poolsError) {
      message.error(t('page.staking.error.failedLoadData'));
    }
  }, [filtersError, poolsError, t]);

  useEffect(() => {
    const params = new URLSearchParams(history.location.search);

    setNullableQueryParam(params, STAKING_QUERY_KEYS.search, search);
    setNullableQueryParam(params, STAKING_QUERY_KEYS.chainId, chainId);
    setNullableQueryParam(params, STAKING_QUERY_KEYS.protocolId, protocolId);

    if (myHoldingOnly) {
      params.set(STAKING_QUERY_KEYS.myHoldingOnly, '1');
    } else {
      params.delete(STAKING_QUERY_KEYS.myHoldingOnly);
    }

    const nextSearchString = params.toString();
    const nextSearch = nextSearchString ? `?${nextSearchString}` : '';
    const currentState = (history.location.state || {}) as StakingRouteState;
    const currentHoldingState = !!currentState.stakingMyHoldingOnly;

    if (
      history.location.search === nextSearch &&
      currentHoldingState === myHoldingOnly
    ) {
      return;
    }

    history.replace({
      pathname: history.location.pathname,
      search: nextSearch,
      hash: history.location.hash,
      state: {
        ...currentState,
        stakingMyHoldingOnly: myHoldingOnly,
      },
    });
  }, [chainId, history, myHoldingOnly, protocolId, search]);

  const handleMyHoldingOnlyChange = useCallback((checked: boolean) => {
    setMyHoldingOnly(checked);
  }, []);

  return (
    <div className="staking-list-page min-h-screen bg-r-neutral-bg2 text-r-neutral-title1">
      <PageHeader
        className="staking-page-header mx-[20px]"
        forceShowBack
        isShowAccount
      >
        {t('page.staking.title')}
      </PageHeader>

      <div className="px-[20px]">
        <Input
          className="staking-search h-[44px]"
          prefix={
            <span className="flex text-r-neutral-foot">
              <SearchIcon />
            </span>
          }
          placeholder={t('page.staking.searchToken')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />

        <div className="mt-[12px] flex h-[32px] items-center justify-between">
          <div className="staking-filter-list">
            <StakingFilterTrigger
              placeholder={t('page.staking.filter.allProtocol')}
              variant="protocol"
              active={protocolSelectorVisible}
              label={
                selectedProtocol
                  ? selectedProtocol.name || selectedProtocol.id
                  : undefined
              }
              icon={
                selectedProtocol ? (
                  <ProtocolLogo protocol={selectedProtocol} size={14} />
                ) : null
              }
              disabled={filtersLoading && !(filters?.protocols || []).length}
              onClick={() => setProtocolSelectorVisible(true)}
              onClear={() => setProtocolId(undefined)}
            />
            <StakingFilterTrigger
              placeholder={t('page.staking.filter.allChains')}
              variant="chain"
              active={chainSelectorVisible}
              label={selectedChain?.name}
              icon={
                selectedChain ? (
                  <ChainLogo chain={selectedChain} size={14} />
                ) : null
              }
              disabled={filtersLoading && !(filters?.chains || []).length}
              onClick={() => setChainSelectorVisible(true)}
              onClear={() => setChainId(undefined)}
            />
          </div>
          <div className="staking-holding-filter">
            <span className="staking-holding-label text-[12px] leading-[14px] font-medium text-r-neutral-body">
              {t('page.staking.myHolding')}
            </span>
            <Switch
              size="small"
              className="staking-holding-switch"
              checked={myHoldingOnly}
              disabled={!account?.address}
              onChange={handleMyHoldingOnlyChange}
            />
          </div>
        </div>
      </div>

      <ProtocolSelectorPopup
        visible={protocolSelectorVisible}
        protocols={filters?.protocols || []}
        selectedProtocolId={protocolId}
        protocolHoldingMap={protocolHoldingMap}
        onClose={() => setProtocolSelectorVisible(false)}
        onSelect={(value) => {
          setProtocolId(value);
          setProtocolSelectorVisible(false);
        }}
      />
      <ChainSelectorPopup
        visible={chainSelectorVisible}
        chains={filters?.chains || []}
        selectedChainId={chainId}
        onClose={() => setChainSelectorVisible(false)}
        onSelect={(value) => {
          setChainId(value);
          setChainSelectorVisible(false);
        }}
      />

      <div className="pb-[16px]">
        {initialLoading ? (
          <StakingSkeleton />
        ) : poolsError ? (
          <div className="mx-[20px] mt-[48px] flex flex-col items-center">
            <StakingEmpty
              search=""
              myHoldingOnly={false}
              hasActiveFilter={false}
              description={t('page.staking.error.failedLoadPools')}
              compact
            />
            <Button className="mt-[12px]" onClick={refreshPools}>
              {t('page.staking.actions.retry')}
            </Button>
          </div>
        ) : pools.length ? (
          <div className="staking-list">
            {pools.map((pool) => (
              <StakingPoolCard
                key={pool.id}
                pool={pool}
                protocol={getDisplayProtocol(pool, protocolMap)}
              />
            ))}
          </div>
        ) : (
          <StakingEmpty
            search={debouncedSearch}
            myHoldingOnly={myHoldingOnly}
            hasActiveFilter={hasActiveFilter}
          />
        )}
      </div>
    </div>
  );
};

export default Staking;
