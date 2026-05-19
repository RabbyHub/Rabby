import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Switch, message } from 'antd';
import { useHistory } from 'react-router-dom';

import { useDebouncedValue } from '@/ui/hooks/useDebounceValue';
import { useRabbySelector } from '@/ui/store';

import { BackIcon, DownIcon, KeyIcon, SearchIcon } from './icons';
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

const Staking = () => {
  const history = useHistory();
  const account = useRabbySelector((state) => state.account.currentAccount);
  const [search, setSearch] = useState('');
  const [chainId, setChainId] = useState<string | undefined>();
  const [protocolId, setProtocolId] = useState<string | undefined>();
  const [protocolSelectorVisible, setProtocolSelectorVisible] = useState(false);
  const [chainSelectorVisible, setChainSelectorVisible] = useState(false);
  const [myHoldingOnly, setMyHoldingOnly] = useState(false);
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

  useEffect(() => {
    if (filtersError || poolsError) {
      message.error('Failed to load staking data');
    }
  }, [filtersError, poolsError]);

  return (
    <div className="staking-list-page min-h-screen bg-r-neutral-bg2 text-r-neutral-title1">
      <div className="h-[60px] relative">
        <div className="absolute left-[20px] top-[20px]">
          <Button
            type="text"
            className="w-[20px] h-[20px] p-0 flex items-center justify-center text-r-neutral-title1"
            icon={<BackIcon />}
            onClick={() => history.goBack()}
          />
        </div>
        <div className="absolute left-1/2 top-[9px] -translate-x-1/2 flex flex-col items-center gap-[2px]">
          <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title1">
            Staking
          </div>
          <div className="flex items-center gap-[4px] text-[13px] leading-[16px] font-medium text-r-neutral-body">
            <KeyIcon />
            <span>Rabby</span>
            <span className="text-r-neutral-foot">
              <DownIcon />
            </span>
          </div>
        </div>
      </div>

      <div className="px-[20px]">
        <Input
          className="staking-search h-[44px]"
          prefix={
            <span className="flex text-r-neutral-foot">
              <SearchIcon />
            </span>
          }
          placeholder="Search Token"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />

        <div className="mt-[12px] flex h-[32px] items-center justify-between">
          <div className="staking-filter-list">
            <StakingFilterTrigger
              placeholder="All Protocol"
              variant="protocol"
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
              placeholder="All Chains"
              variant="chain"
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
              My Holding
            </span>
            <Switch
              size="small"
              className="staking-holding-switch"
              checked={myHoldingOnly}
              disabled={!account?.address}
              onChange={setMyHoldingOnly}
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
              description="Failed to load staking pools"
              compact
            />
            <Button className="mt-[12px]" onClick={refreshPools}>
              Retry
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
          />
        )}
      </div>
    </div>
  );
};

export default Staking;
