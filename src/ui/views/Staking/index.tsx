import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Switch, message } from 'antd';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';

import { Popup } from '@/ui/component';
import { useDebouncedValue } from '@/ui/hooks/useDebounceValue';
import { useRabbySelector } from '@/ui/store';
import { findChainByServerID } from '@/utils/chain';

import {
  PoolTypeTag,
  ProtocolIconChip,
  ProtocolLogo,
  TokenLogos,
} from './components/PoolVisuals';
import { useStakingFilters } from './hooks/useStakingFilters';
import { useStakingPools } from './hooks/useStakingPools';
import type { StakingFilterItem, StakingPool, StakingProtocol } from './types';
import { formatStakingPercent, formatStakingUsd } from './utils/format';

const PAGE_LIMIT = 50;

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M13.5 3L6.5 10L13.5 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M7.56 7.56L14.26.86M7.51 7.68C8.51 8.66 8.91 10.1 8.55 11.46C8.19 12.81 7.12 13.87 5.76 14.23C4.4 14.59 2.95 14.19 1.96 13.2C.48 11.67.5 9.23 2.01 7.73C3.52 6.22 5.97 6.2 7.51 7.68ZM10.44 4.76L12.58 6.89L15.08 4.41L12.94 2.28L10.44 4.76Z"
      stroke="currentColor"
      strokeWidth="1.125"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M12.57 6.86L8 11.43L3.43 6.86"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M7.33 12.67A5.33 5.33 0 1 0 7.33 2a5.33 5.33 0 0 0 0 10.67ZM14 14l-2.9-2.9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2.4 2.4L9.6 9.6M9.6 2.4L2.4 9.6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const EmptyPoolsIcon = () => (
  <svg width="80" height="64" viewBox="0 0 80 64" fill="none">
    <path
      d="M19 48.5h42"
      stroke="var(--r-neutral-line)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M30 20.5h20c5.25 0 9.5 4.25 9.5 9.5v.5c0 5.25-4.25 9.5-9.5 9.5H30c-5.25 0-9.5-4.25-9.5-9.5V30c0-5.25 4.25-9.5 9.5-9.5Z"
      fill="var(--r-neutral-card1)"
      stroke="var(--r-neutral-line)"
    />
    <path
      d="M34 28.5h12M34 34.5h8"
      stroke="var(--r-neutral-foot)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity=".45"
    />
    <circle cx="55" cy="22" r="6" fill="var(--r-blue-light1)" />
    <path
      d="m52.5 22 1.6 1.6 3.2-3.2"
      stroke="var(--r-blue-default)"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getDisplayProtocol = (
  pool: StakingPool,
  protocolMap: Record<string, StakingProtocol>
): StakingProtocol => ({
  ...protocolMap[pool.protocol.id],
  ...pool.protocol,
  logo_url: pool.protocol.logo_url || protocolMap[pool.protocol.id]?.logo_url,
});

const getDisplayChain = (filterChain: StakingFilterItem) => {
  const chain = findChainByServerID(filterChain.id);

  return {
    id: filterChain.id,
    name: filterChain.name || chain?.name || filterChain.id,
    logo: filterChain.logo_url || chain?.logo,
  };
};

const ChainLogo = ({
  chain,
  size = 20,
}: {
  chain: ReturnType<typeof getDisplayChain>;
  size?: number;
}) => {
  const style = { width: size, height: size };

  if (!chain.logo) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-r-blue-light1 text-[10px] font-medium text-r-blue-default"
        style={style}
      >
        {(chain.name || chain.id).slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={chain.logo}
      alt={chain.name}
      className="block shrink-0 rounded-full object-cover"
      style={style}
    />
  );
};

const StakingFilterTrigger = ({
  placeholder,
  label,
  icon,
  variant,
  disabled,
  onClick,
  onClear,
}: {
  placeholder: string;
  label?: string;
  icon?: React.ReactNode;
  variant: 'protocol' | 'chain';
  disabled?: boolean;
  onClick: () => void;
  onClear: () => void;
}) => {
  const selected = !!label;

  return (
    <span
      className={clsx(
        'staking-filter-trigger',
        `is-${variant}`,
        selected && 'is-selected',
        disabled && 'is-disabled'
      )}
    >
      <button
        type="button"
        className="staking-filter-trigger-main"
        disabled={disabled}
        onClick={onClick}
      >
        {selected ? icon : null}
        <span className="staking-filter-trigger-label">
          {selected ? label : placeholder}
        </span>
        {!selected ? (
          <span className="staking-filter-trigger-icon">
            <DownIcon />
          </span>
        ) : null}
      </button>
      {selected ? (
        <button
          type="button"
          className="staking-filter-trigger-clear"
          aria-label={`Clear ${placeholder}`}
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
};

const StakingPoolCard = ({
  pool,
  protocol,
}: {
  pool: StakingPool;
  protocol: StakingProtocol;
}) => {
  const history = useHistory();
  const feeTag = pool.tags?.find((tag) => /\d+(\.\d+)?%/.test(tag.name));
  const builtInTagNames = new Set([
    'yield',
    'lp',
    'v2',
    'v3',
    feeTag?.name?.toLowerCase() || '',
  ]);
  const extraTags = (pool.tags || [])
    .filter((tag) => !builtInTagNames.has(tag.name.toLowerCase()))
    .slice(0, 2);

  return (
    <button
      type="button"
      className="staking-pool-card group"
      onClick={() =>
        history.push(`/staking/detail?pool_id=${encodeURIComponent(pool.id)}`)
      }
    >
      <div className="flex min-w-0 items-center gap-[8px]">
        <TokenLogos
          tokens={pool.tokens.supplies}
          chainServerId={pool.chain_id}
          size="list"
        />
        <div className="min-w-0">
          <div className="truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
            {pool.display_name || pool.name || pool.id}
          </div>
          <div className="mt-[2px] flex min-w-0 items-center gap-[2px] overflow-hidden">
            <ProtocolIconChip protocol={protocol} />
            <PoolTypeTag pool={pool} />
            {feeTag ? (
              <span className="staking-chip">{feeTag.name}</span>
            ) : null}
            {extraTags.map((tag) => (
              <span key={tag.id || tag.name} className="staking-chip">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[15px] leading-[18px] font-medium text-r-neutral-title1">
          {formatStakingUsd(pool.tvl)} TVL
        </div>
        <div className="mt-[2px] text-[13px] leading-[16px] text-r-neutral-foot">
          {formatStakingPercent(pool.apr)} {pool.metricLabel}
        </div>
      </div>

      {pool.is_holding ? (
        <span className="staking-holding-ribbon">Holding</span>
      ) : null}
    </button>
  );
};

const StakingSkeleton = () => (
  <div className="staking-list">
    {Array.from({ length: 7 }).map((_, index) => (
      <div key={index} className="staking-skeleton-row">
        <div className="staking-skeleton-avatar" />
        <div className="staking-skeleton-main">
          <div className="staking-skeleton-title" />
          <div className="staking-skeleton-tags">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="staking-skeleton-metrics">
          <div />
          <span />
        </div>
      </div>
    ))}
  </div>
);

const StakingEmpty = ({
  search,
  myHoldingOnly,
  description,
  compact,
}: {
  search: string;
  myHoldingOnly: boolean;
  description?: string;
  compact?: boolean;
}) => {
  const hasSearch = !!search.trim();
  const text =
    description ||
    (hasSearch
      ? 'No pools found'
      : myHoldingOnly
      ? 'No holdings found'
      : 'No staking pools found');

  return (
    <div className={clsx('staking-empty', compact && 'is-compact')}>
      <EmptyPoolsIcon />
      <div className="mt-[12px] text-[15px] leading-[18px] font-medium text-r-neutral-foot">
        {text}
      </div>
    </div>
  );
};

const ProtocolSelectorPopup = ({
  visible,
  protocols,
  selectedProtocolId,
  protocolHoldingMap,
  onClose,
  onSelect,
}: {
  visible: boolean;
  protocols: StakingProtocol[];
  selectedProtocolId?: string;
  protocolHoldingMap: Record<string, boolean>;
  onClose: () => void;
  onSelect: (protocolId?: string) => void;
}) => {
  const [search, setSearch] = useState('');

  const filteredProtocols = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return protocols;
    }

    return protocols.filter((protocol) => {
      const name = protocol.name || protocol.id;
      return (
        name.toLowerCase().includes(keyword) ||
        protocol.id.toLowerCase().includes(keyword)
      );
    });
  }, [protocols, search]);

  const handleSelect = (protocolId?: string) => {
    onSelect(protocolId);
    setSearch('');
  };
  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Popup
      visible={visible}
      title="Select Protocol"
      height={540}
      closable
      isNew
      isSupportDarkMode
      className="staking-selector-popup"
      onCancel={handleClose}
    >
      <div className="staking-selector-popup-body">
        <Input
          className="staking-selector-search h-[44px]"
          prefix={
            <span className="flex text-r-neutral-foot">
              <SearchIcon />
            </span>
          }
          placeholder="Search by Name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />

        <div className="staking-selector-list">
          {selectedProtocolId && !search.trim() ? (
            <button
              type="button"
              className="staking-selector-row"
              onClick={() => handleSelect(undefined)}
            >
              <span className="staking-selector-all-icon">All</span>
              <span className="min-w-0 truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                All Protocol
              </span>
            </button>
          ) : null}

          {filteredProtocols.map((protocol) => {
            const hasHolding =
              protocol.is_holding || protocolHoldingMap[protocol.id];

            return (
              <button
                key={protocol.id}
                type="button"
                className={clsx(
                  'staking-selector-row',
                  selectedProtocolId === protocol.id && 'is-selected'
                )}
                onClick={() => handleSelect(protocol.id)}
              >
                <ProtocolLogo protocol={protocol} size={32} />
                <span className="min-w-0 truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                  {protocol.name || protocol.id}
                </span>
                {hasHolding ? (
                  <span className="staking-holding-ribbon">Holding</span>
                ) : null}
              </button>
            );
          })}

          {!filteredProtocols.length ? (
            <div className="staking-selector-empty">
              <EmptyPoolsIcon />
              <div>No protocols</div>
            </div>
          ) : null}
        </div>
      </div>
    </Popup>
  );
};

const ChainSelectorPopup = ({
  visible,
  chains,
  selectedChainId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  chains: StakingFilterItem[];
  selectedChainId?: string;
  onClose: () => void;
  onSelect: (chainId?: string) => void;
}) => {
  const [search, setSearch] = useState('');

  const filteredChains = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return chains;
    }

    return chains.filter((filterChain) => {
      const chain = getDisplayChain(filterChain);
      return (
        chain.name.toLowerCase().includes(keyword) ||
        chain.id.toLowerCase().includes(keyword)
      );
    });
  }, [chains, search]);

  const handleSelect = (nextChainId?: string) => {
    onSelect(nextChainId);
    setSearch('');
  };
  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Popup
      visible={visible}
      title="Select Chain"
      height={540}
      closable
      isNew
      isSupportDarkMode
      className="staking-selector-popup"
      onCancel={handleClose}
    >
      <div className="staking-selector-popup-body">
        <Input
          className="staking-selector-search h-[44px]"
          prefix={
            <span className="flex text-r-neutral-foot">
              <SearchIcon />
            </span>
          }
          placeholder="Search by Name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          allowClear
        />

        <div className="staking-selector-list">
          {selectedChainId && !search.trim() ? (
            <button
              type="button"
              className="staking-selector-row"
              onClick={() => handleSelect(undefined)}
            >
              <span className="staking-selector-all-icon">All</span>
              <span className="min-w-0 truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                All Chains
              </span>
            </button>
          ) : null}

          {filteredChains.map((filterChain) => {
            const chain = getDisplayChain(filterChain);

            return (
              <button
                key={filterChain.id}
                type="button"
                className={clsx(
                  'staking-selector-row',
                  selectedChainId === filterChain.id && 'is-selected'
                )}
                onClick={() => handleSelect(filterChain.id)}
              >
                <ChainLogo chain={chain} size={32} />
                <span className="min-w-0 truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                  {chain.name}
                </span>
              </button>
            );
          })}

          {!filteredChains.length ? (
            <div className="staking-selector-empty">
              <EmptyPoolsIcon />
              <div>No chains</div>
            </div>
          ) : null}
        </div>
      </div>
    </Popup>
  );
};

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
      <style>
        {`
          .staking-list-page .staking-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 16px;
            padding: 2px 4px;
            border: 0.5px solid var(--r-neutral-line);
            border-radius: 4px;
            background: transparent;
            color: var(--r-neutral-foot);
            font-size: 10px;
            line-height: 12px;
            font-weight: 500;
            white-space: nowrap;
          }

          .staking-list-page .staking-chip-icon {
            width: 22px;
            height: 18px;
            padding: 2px 4px;
          }

          .staking-list-page .staking-holding-ribbon {
            position: absolute;
            right: 0;
            top: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 14px;
            padding: 0 8px 2px;
            border-radius: 0 8px 0 8px;
            color: var(--r-blue-default);
            background: var(--r-blue-light1);
            font-size: 10px;
            line-height: 12px;
            font-weight: 600;
          }

          .staking-list-page .staking-filter-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 1 auto;
            height: 32px;
            border: 0;
            border-radius: 8px;
            overflow: hidden;
            background: var(--r-neutral-card1);
            color: var(--r-neutral-body);
            font-size: 12px;
            line-height: 14px;
            font-weight: 500;
            white-space: nowrap;
          }

          .staking-list-page .staking-filter-trigger.is-selected.is-protocol {
            max-width: 106px;
          }

          .staking-list-page .staking-filter-trigger.is-selected.is-chain {
            max-width: 114px;
          }

          .staking-list-page .staking-filter-trigger.is-disabled {
            opacity: 0.6;
          }

          .staking-list-page .staking-filter-trigger-main {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
            height: 32px;
            padding: 0 12px;
            gap: 4px;
            flex: 1 1 auto;
            border: 0;
            background: transparent;
            color: inherit;
            font: inherit;
          }

          .staking-list-page .staking-filter-trigger-main:disabled {
            cursor: default;
          }

          .staking-list-page .staking-filter-trigger.is-selected .staking-filter-trigger-main {
            padding-right: 4px;
          }

          .staking-list-page .staking-filter-trigger-label {
            display: block;
            max-width: 136px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .staking-list-page .staking-filter-trigger.is-selected .staking-filter-trigger-label {
            max-width: none;
            min-width: 0;
          }

          .staking-list-page .staking-filter-trigger-icon {
            display: flex;
            width: 12px;
            height: 12px;
            color: var(--r-neutral-foot);
          }

          .staking-list-page .staking-filter-trigger-icon svg {
            width: 12px;
            height: 12px;
          }

          .staking-list-page .staking-filter-trigger-clear {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 24px;
            width: 24px;
            height: 32px;
            padding: 0;
            border: 0;
            background: transparent;
            color: var(--r-neutral-foot);
          }

          .staking-list-page .staking-filter-list {
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 228px;
            min-width: 0;
            flex: 0 1 228px;
            overflow: hidden;
          }

          .staking-list-page .staking-pool-card {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 64px;
            padding: 14px 12px;
            border: 0;
            border-radius: 8px;
            background: var(--r-neutral-card1);
            text-align: left;
          }

          .staking-list-page .staking-pool-card:hover {
            border: 1px solid var(--r-blue-default);
            padding: 13px 11px;
          }

          .staking-list-page .staking-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 360px;
            margin: 12px auto 0;
          }

          .staking-list-page .staking-skeleton-row {
            display: flex;
            align-items: center;
            height: 64px;
            padding: 14px 12px;
            border-radius: 8px;
            background: var(--r-neutral-card1);
          }

          .staking-list-page .staking-skeleton-avatar,
          .staking-list-page .staking-skeleton-title,
          .staking-list-page .staking-skeleton-tags span,
          .staking-list-page .staking-skeleton-metrics div,
          .staking-list-page .staking-skeleton-metrics span {
            background: var(--r-neutral-bg4);
            border-radius: 999px;
          }

          .staking-list-page .staking-skeleton-avatar {
            width: 34px;
            height: 34px;
          }

          .staking-list-page .staking-skeleton-main {
            margin-left: 8px;
            display: flex;
            flex: 1 1 auto;
            min-width: 0;
            flex-direction: column;
            gap: 6px;
          }

          .staking-list-page .staking-skeleton-title {
            width: 78px;
            height: 16px;
          }

          .staking-list-page .staking-skeleton-tags {
            display: flex;
            gap: 4px;
          }

          .staking-list-page .staking-skeleton-tags span {
            width: 32px;
            height: 14px;
          }

          .staking-list-page .staking-skeleton-metrics {
            display: flex;
            flex: 0 0 100px;
            align-items: flex-end;
            flex-direction: column;
            gap: 6px;
          }

          .staking-list-page .staking-skeleton-metrics div {
            width: 92px;
            height: 16px;
          }

          .staking-list-page .staking-skeleton-metrics span {
            width: 72px;
            height: 14px;
          }

          .staking-list-page .staking-empty {
            display: flex;
            width: 362px;
            height: 416px;
            margin: 12px auto 0;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--r-neutral-foot);
          }

          .staking-list-page .staking-search.ant-input-affix-wrapper {
            border-radius: 8px !important;
            border-color: var(--r-neutral-line) !important;
            background: var(--r-neutral-card1) !important;
            box-shadow: none !important;
          }

          .staking-list-page .staking-search .ant-input {
            color: var(--r-neutral-title1);
            font-size: 13px;
          }

          .staking-list-page .staking-search .ant-input::placeholder {
            color: var(--r-neutral-foot);
          }

          .staking-list-page .staking-holding-filter {
            display: flex;
            align-items: center;
            gap: 4px;
            width: 100px;
            flex-shrink: 0;
          }

          .staking-list-page .staking-holding-label {
            flex: 0 0 auto;
            white-space: nowrap;
          }

          .staking-list-page .staking-holding-switch.ant-switch-small {
            min-width: 32px;
            width: 32px;
            height: 16px;
            flex-shrink: 0;
            background: var(--r-neutral-line) !important;
          }

          .staking-list-page .staking-holding-switch.ant-switch-small.ant-switch-checked {
            background: var(--r-blue-default) !important;
          }

          .staking-list-page .staking-holding-switch.ant-switch-small .ant-switch-handle {
            width: 14px;
            height: 14px;
            top: 1px;
            left: 1px;
          }

          .staking-list-page .staking-holding-switch.ant-switch-small.ant-switch-checked .ant-switch-handle {
            left: calc(100% - 15px);
          }

          .staking-selector-popup .ant-drawer-content {
            background: var(--r-neutral-bg2) !important;
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -12px 20px rgba(19, 20, 26, 0.05);
          }

          .staking-selector-popup .ant-drawer-header {
            height: 52px;
            padding: 0;
          }

          .staking-selector-popup .ant-drawer-title {
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            line-height: 24px;
            font-weight: 500;
            color: var(--r-neutral-title1);
          }

          .staking-selector-popup .ant-drawer-close {
            right: 20px;
            top: 16px;
            width: 20px;
            height: 20px;
            padding: 0;
          }

          .staking-selector-popup .ant-drawer-body {
            height: calc(100% - 52px);
            padding: 6px 20px 20px;
            overflow: hidden;
          }

          .staking-selector-popup .staking-selector-popup-body {
            display: flex;
            flex-direction: column;
            height: 100%;
            gap: 12px;
          }

          .staking-selector-popup .staking-selector-search.ant-input-affix-wrapper {
            flex: 0 0 auto;
            border-radius: 8px !important;
            border-color: var(--r-neutral-line) !important;
            background: var(--r-neutral-card1) !important;
            box-shadow: none !important;
          }

          .staking-selector-popup .staking-selector-search .ant-input {
            color: var(--r-neutral-title1);
            font-size: 13px;
          }

          .staking-selector-popup .staking-selector-search .ant-input::placeholder {
            color: var(--r-neutral-foot);
          }

          .staking-selector-popup .staking-selector-list {
            display: flex;
            flex: 1 1 auto;
            min-height: 0;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
          }

          .staking-selector-popup .staking-selector-row {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
            min-height: 60px;
            padding: 14px 12px;
            gap: 8px;
            border: 0;
            border-radius: 8px;
            background: var(--r-neutral-card1);
            text-align: left;
          }

          .staking-selector-popup .staking-selector-row.is-selected {
            border: 1px solid var(--r-blue-default);
            padding: 13px 11px;
          }

          .staking-selector-popup .staking-selector-all-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--r-blue-light1);
            color: var(--r-blue-default);
            font-size: 10px;
            line-height: 12px;
            font-weight: 600;
            flex-shrink: 0;
          }

          .staking-selector-popup .staking-holding-ribbon {
            position: absolute;
            right: 0;
            top: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 14px;
            padding: 0 8px 2px;
            border-radius: 0 8px 0 8px;
            color: var(--r-blue-default);
            background: var(--r-blue-light1);
            font-size: 10px;
            line-height: 12px;
            font-weight: 600;
          }

          .staking-selector-popup .staking-selector-empty {
            display: flex;
            flex: 1 1 auto;
            min-height: 220px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: var(--r-neutral-foot);
            font-size: 15px;
            line-height: 18px;
            font-weight: 500;
          }

          .staking-list-page .staking-empty.is-compact {
            height: 220px;
            margin-top: 0;
          }
        `}
      </style>

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
