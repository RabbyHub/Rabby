import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Empty } from 'antd';
import { sortBy } from 'lodash';
import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
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
  positionAndOpenOrders: PositionAndOpenOrder[];
  onSelect: (coin: string) => void;
  favoritedCoins?: string[];
  onToggleFavorite?: (coin: string) => void;
  initialTab?: PerpsCategoryId;
}

export const SearchPerpsPopup: React.FC<SearchPerpsPopupProps> = ({
  visible,
  openFromSource,
  onCancel,
  marketData,
  positionAndOpenOrders,
  onSelect,
  favoritedCoins,
  onToggleFavorite,
  initialTab,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    if (visible) {
      setActiveTab(defaultTab);
    }
  }, [visible, defaultTab]);

  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!visible || !activeTab) return;
    const rafId = requestAnimationFrame(() => {
      tabRefs.current[activeTab]?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest',
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [visible, activeTab, visibleSearchTabs]);

  const activeTabItems = useMemo(() => {
    return visibleSearchTabs.find((tab) => tab.id === activeTab)?.items ?? [];
  }, [visibleSearchTabs, activeTab]);

  const activeTabCfg = useMemo(
    () => visibleSearchTabs.find((tab) => tab.id === activeTab)?.cfg,
    [visibleSearchTabs, activeTab]
  );

  const sortedForSearch = useMemo(() => {
    const sorted = sortBy(marketData, (item) => -(Number(item.dayNtlVlm) || 0));
    if (!favoritedCoins?.length) return sorted;
    const favs = sorted.filter((it) => favoritedCoins.includes(it.name));
    const others = sorted.filter((it) => !favoritedCoins.includes(it.name));
    return [...favs, ...others];
  }, [marketData, favoritedCoins]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return activeTabItems;
    }
    return sortedForSearch.filter((item) => {
      if (item.name.toLowerCase().includes(q)) return true;
      if ((item.displayName || '').toLowerCase().includes(q)) return true;
      if ((item.quoteAsset || '').toLowerCase().includes(q)) return true;
      return false;
    });
  }, [activeTabItems, sortedForSearch, search]);

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
                    onClick={() => setActiveTab(tab.id)}
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
                              ? 'text-r-blue-default'
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

        <div className="flex-1 overflow-y-auto px-20 min-h-0">
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
