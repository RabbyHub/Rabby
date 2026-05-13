import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Empty, InputRef } from 'antd';
import { sortBy } from 'lodash';
import { MarketData } from '@/ui/models/perps';
import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';
import { ReactComponent as RcIconFavoriteStarCC } from '@/ui/assets/perps/IconFavoriteStarCC.svg';
import clsx from 'clsx';
import { Popup } from '@/ui/component';
import { AssetItem } from '../components/AssetMetaItem';
import { HorizontalScrollContainer } from '../../DesktopPerps/components/ChartArea/components/HorizontalScrollContainer';
import { usePerpsGroupedMarketData } from '../hooks/usePerpsGroupedMarketData';
import { PerpsCategoryId } from '../constants/perpsCategories';
import { useRabbySelector } from '@/ui/store';
import styled from 'styled-components';
import { SvgIconCross } from 'ui/assets';

const SearchInput = styled(Input)`
  background-color: var(--r-neutral-card1, #fff) !important;
  &.ant-input-affix-wrapper-focused {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  height: 46px !important;
  border-radius: 6px !important;
  input::placeholder {
    color: var(--r-neutral-foot, #6a7587) !important;
  }
  &:hover {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
`;

const closeIcon = (
  <SvgIconCross className="w-14 fill-current text-gray-content" />
);

interface SearchPerpsPopupProps {
  visible: boolean;
  openFromSource: 'openPosition' | 'searchPerps';
  onCancel: () => void;
  marketData: MarketData[];
  onSelect: (coin: string) => void;
  favoritedCoins?: string[];
  initialTab?: PerpsCategoryId;
  autoFocus?: boolean;
}

export const SearchPerpsPopup: React.FC<SearchPerpsPopupProps> = ({
  visible,
  openFromSource,
  onCancel,
  marketData,
  onSelect,
  favoritedCoins,
  initialTab,
  autoFocus,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<InputRef>(null);

  const shouldAutoFocus = autoFocus ?? openFromSource === 'searchPerps';

  // Delay focus past the Popup slide-in animation, otherwise the input
  // scrolls awkwardly mid-animation.
  useEffect(() => {
    if (!visible || !shouldAutoFocus) return;
    const id = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(id);
  }, [visible, shouldAutoFocus]);

  const marketDataCategories = useRabbySelector(
    (s) => s.perps.marketDataCategories
  );

  const { visibleSearchTabs } = usePerpsGroupedMarketData({
    marketData,
    favoriteMarkets: favoritedCoins ?? [],
    backendCategories: marketDataCategories,
  });

  const visibleTabIds = useMemo(() => visibleSearchTabs.map((tab) => tab.id), [
    visibleSearchTabs,
  ]);

  const defaultTab: PerpsCategoryId | undefined = useMemo(() => {
    if (initialTab && visibleTabIds.includes(initialTab)) {
      return initialTab;
    }
    if (visibleTabIds.includes('topVolume')) {
      return 'topVolume';
    }
    return visibleTabIds[0];
  }, [initialTab, visibleTabIds]);

  const [activeTab, setActiveTab] = useState<PerpsCategoryId | undefined>(
    defaultTab
  );
  // After a manual tab pick, late-arriving backend categories must not
  // overwrite the user's choice.
  const manuallySelectedRef = useRef(false);
  const handleSelectTab = (id: PerpsCategoryId) => {
    manuallySelectedRef.current = true;
    setActiveTab(id);
  };

  useEffect(() => {
    if (visible && !manuallySelectedRef.current) {
      setActiveTab(defaultTab);
    }
  }, [visible, defaultTab]);

  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listScrollRef = useRef<HTMLDivElement>(null);
  // Dedupe scrollIntoView: `visibleSearchTabs` is a dep so retries cover
  // the open-animation window, but without this guard every WS tick would
  // yank the bar back to the active tab after a manual horizontal scroll.
  const lastScrolledTabRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) {
      lastScrolledTabRef.current = null;
      manuallySelectedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !activeTab) return;
    if (lastScrolledTabRef.current === activeTab) return;
    const rafId = requestAnimationFrame(() => {
      const el = tabRefs.current[activeTab];
      if (!el) return;
      // `center` clamps to edges for first/last tab; middle tabs land
      // centered with surrounding context visible.
      el.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      });
      lastScrolledTabRef.current = activeTab;
    });
    return () => cancelAnimationFrame(rafId);
  }, [visible, activeTab, visibleSearchTabs]);

  useEffect(() => {
    if (!visible || !activeTab) return;
    const el = listScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [visible, activeTab]);

  const activeTabItems = useMemo(() => {
    return visibleSearchTabs.find((tab) => tab.id === activeTab)?.items ?? [];
  }, [visibleSearchTabs, activeTab]);

  const activeTabCfg = useMemo(
    () => visibleSearchTabs.find((tab) => tab.id === activeTab)?.cfg,
    [visibleSearchTabs, activeTab]
  );

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return activeTabItems;
    }
    // Sort gated behind a non-empty query so the popup stays cheap while idle.
    const sorted = sortBy(marketData, (item) => -(Number(item.dayNtlVlm) || 0));
    const ordered = favoritedCoins?.length
      ? [
          ...sorted.filter((it) => favoritedCoins.includes(it.name)),
          ...sorted.filter((it) => !favoritedCoins.includes(it.name)),
        ]
      : sorted;
    return ordered.filter((item) => {
      if (item.name.toLowerCase().includes(q)) return true;
      if ((item.displayName || '').toLowerCase().includes(q)) return true;
      if ((item.quoteAsset || '').toLowerCase().includes(q)) return true;
      return false;
    });
  }, [activeTabItems, marketData, favoritedCoins, search]);

  const isSearching = search.trim().length > 0;

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  return (
    <Popup
      visible={visible}
      closable
      onCancel={onCancel}
      isSupportDarkMode
      closeIcon={closeIcon}
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      title={null}
      height={540}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 text-center mt-12 mb-8">
          {openFromSource === 'openPosition'
            ? t('page.perps.searchPerpsPopup.openPosition')
            : t('page.perps.searchPerpsPopup.searchPerps')}
        </div>
        <div className="px-20 mb-12">
          <SearchInput
            ref={searchInputRef}
            prefix={
              <SearchSVG className="w-[16px] h-[16px] text-r-neutral-foot" />
            }
            placeholder={
              openFromSource === 'openPosition'
                ? t('page.perps.searchPerpsPopup.searchPosition')
                : t('page.perps.searchPerpsPopup.searchPlaceholder')
            }
            className={clsx('text-14 text-r-neutral-title-1 transform-none')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>

        {!isSearching && visibleSearchTabs.length > 0 && (
          <div className="flex items-center px-20 mb-12 border-b-[0.5px] border-solid border-rb-neutral-line">
            <HorizontalScrollContainer scrollStep={200} showArrows>
              {visibleSearchTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isFav = tab.id === 'favorite';
                return (
                  <div
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    onClick={() => handleSelectTab(tab.id)}
                    className={clsx(
                      'flex flex-col items-center cursor-pointer whitespace-nowrap mr-12 text-[16px] font-medium',
                      isActive
                        ? 'text-r-blue-default'
                        : 'text-rb-neutral-secondary'
                    )}
                  >
                    <div className="flex items-center h-[24px]">
                      {isFav ? (
                        <RcIconFavoriteStarCC
                          className={clsx(
                            'w-18 h-18',
                            isActive
                              ? 'text-rb-orange-default'
                              : 'text-rb-neutral-info'
                          )}
                        />
                      ) : (
                        tab.cfg.label
                      )}
                    </div>
                    <span
                      className={clsx(
                        'mt-4 h-[3px] w-full rounded-full',
                        isActive ? 'bg-r-blue-default' : 'bg-transparent'
                      )}
                    />
                  </div>
                );
              })}
            </HorizontalScrollContainer>
          </div>
        )}

        <div
          ref={listScrollRef}
          className="flex-1 overflow-y-auto px-20 pb-20 min-h-0"
        >
          {filteredList.length === 0 ? (
            <Empty
              className="text-r-neutral-title-1"
              description={t('page.perps.searchPerpsPopup.empty')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div className="flex flex-col gap-8">
              {filteredList.map((item, i) => {
                const rank =
                  !isSearching && activeTabCfg?.showRankOnSearch
                    ? i + 1
                    : undefined;
                return (
                  <AssetItem
                    key={item.name}
                    item={item}
                    rank={rank}
                    onClick={() => {
                      onSelect(item.name);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Popup>
  );
};
