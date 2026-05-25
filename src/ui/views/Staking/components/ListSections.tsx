import React, { useMemo, useState } from 'react';
import { Input } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

import { Popup } from '@/ui/component';
import { findChainByServerID } from '@/utils/chain';

import {
  PoolTypeTag,
  ProtocolIconChip,
  ProtocolLogo,
  TokenLogos,
} from './PoolVisuals';
import { CloseIcon, DownIcon, EmptyPoolsIcon, SearchIcon } from '../icons';
import type { StakingFilterItem, StakingPool, StakingProtocol } from '../types';
import { formatStakingPercent, formatStakingTVL } from '../utils/format';

export { ProtocolLogo };

export const getDisplayProtocol = (
  pool: StakingPool,
  protocolMap: Record<string, StakingProtocol>
): StakingProtocol => ({
  ...protocolMap[pool.protocol.id],
  ...pool.protocol,
  logo_url: pool.protocol.logo_url || protocolMap[pool.protocol.id]?.logo_url,
});

export const getDisplayChain = (filterChain: StakingFilterItem) => {
  const chain = findChainByServerID(filterChain.id);

  return {
    id: filterChain.id,
    name: filterChain.name || chain?.name || filterChain.id,
    logo: filterChain.logo_url || chain?.logo,
  };
};

export const ChainLogo = ({
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

export const StakingFilterTrigger = ({
  placeholder,
  label,
  icon,
  variant,
  active,
  disabled,
  onClick,
  onClear,
}: {
  placeholder: string;
  label?: string;
  icon?: React.ReactNode;
  variant: 'protocol' | 'chain';
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onClear: () => void;
}) => {
  const { t } = useTranslation();
  const selected = !!label;

  return (
    <span
      className={clsx(
        'staking-filter-trigger',
        `is-${variant}`,
        selected && 'is-selected',
        active && 'is-active',
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
          aria-label={t('page.staking.filter.clearFilter', {
            filter: placeholder,
          })}
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

export const StakingPoolCard = ({
  pool,
  protocol,
}: {
  pool: StakingPool;
  protocol: StakingProtocol;
}) => {
  const { t } = useTranslation();
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
          {formatStakingTVL(pool.tvl)} {t('page.staking.metrics.tvl')}
        </div>
        <div className="mt-[2px] text-[13px] leading-[16px] text-r-neutral-foot">
          {formatStakingPercent(pool.apr)} {pool.metricLabel}
        </div>
      </div>

      {pool.is_holding ? (
        <span className="staking-holding-ribbon">
          {t('page.staking.holding')}
        </span>
      ) : null}
    </button>
  );
};

export const StakingSkeleton = () => (
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

export const StakingEmpty = ({
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
  const { t } = useTranslation();
  const hasSearch = !!search.trim();
  const text =
    description ||
    (hasSearch
      ? t('page.staking.empty.noPoolsFound')
      : myHoldingOnly
      ? t('page.staking.empty.noHoldingsFound')
      : t('page.staking.empty.noStakingPoolsFound'));

  return (
    <div className={clsx('staking-empty', compact && 'is-compact')}>
      <EmptyPoolsIcon />
      <div className="mt-[12px] text-[15px] leading-[18px] font-medium text-r-neutral-foot">
        {text}
      </div>
    </div>
  );
};

export const ProtocolSelectorPopup = ({
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
  const { t } = useTranslation();
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
          placeholder={t('page.staking.filter.searchByName')}
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
              <span className="staking-selector-all-icon">
                {t('page.staking.filter.all')}
              </span>
              <span className="min-w-0 truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                {t('page.staking.filter.allProtocol')}
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
                  <span className="staking-holding-ribbon">
                    {t('page.staking.holding')}
                  </span>
                ) : null}
              </button>
            );
          })}

          {!filteredProtocols.length ? (
            <div className="staking-selector-empty">
              <EmptyPoolsIcon />
              <div>{t('page.staking.empty.noProtocols')}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Popup>
  );
};

export const ChainSelectorPopup = ({
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
  const { t } = useTranslation();
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
          placeholder={t('page.staking.filter.searchByName')}
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
              <span className="staking-selector-all-icon">
                {t('page.staking.filter.all')}
              </span>
              <span className="min-w-0 truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                {t('page.staking.filter.allChains')}
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
              <div>{t('page.staking.empty.noChains')}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Popup>
  );
};
