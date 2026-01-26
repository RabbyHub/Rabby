import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  CSSProperties,
  memo,
} from 'react';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import { Dropdown, Input } from 'antd';
import { ReactComponent as RcIconArrowDown } from '@/ui/assets/perps/icon-arrow-down.svg';
import { ReactComponent as RcIconStar } from '@/ui/assets/perps/icon-star.svg';
import { ReactComponent as RcIconStarFilled } from '@/ui/assets/perps/icon-star-filled.svg';
import { ReactComponent as RcIconSearch } from '@/ui/assets/perps/IconSearchCC.svg';
import { TokenImg } from '@/ui/views/Perps/components/TokenImg';
import { MarketData } from '@/ui/models/perps';
import { formatPercent } from '@/ui/views/Perps/utils';
import { formatUsdValueKMB } from '@/ui/views/Dashboard/components/TokenDetailPopup/utils';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FixedSizeList } from 'react-window';

const SearchInput = styled(Input)`
  background-color: var(--r-neutral-card1, #fff) !important;
  &.ant-input-affix-wrapper-focused {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  .ant-input {
    background-color: transparent !important;
    color: var(--rb-neutral-title-1, #192945) !important;
  }
  height: 46px !important;
  border-radius: 6px !important;
  input::placeholder {
    color: var(--r-neutral-foot, #6a7587) !important;
  }
  &:hover {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  border-color: var(--r-neutral-line, #d3d8e0) !important;
`;

interface CoinDropdownProps {
  coin: string;
  onSelectCoin: (coin: string) => void;
}

const ROW_HEIGHT = 48;

type SortField =
  | 'name'
  | 'markPx'
  | 'change'
  | 'funding'
  | 'dayNtlVlm'
  | 'openInterest';
type SortOrder = 'asc' | 'desc';

interface MarketRowProps {
  index: number;
  style: CSSProperties;
  data: {
    items: MarketData[];
    favoritedCoins: string[];
    lastFavoritedIndex: number;
    onSelectCoin: (coin: string) => void;
    onToggleFavorite: (coinName: string, e: React.MouseEvent) => void;
    setDropdownVisible: (visible: boolean) => void;
    setSearchText: (text: string) => void;
  };
}

const calculateChangeValue = (item: MarketData) => {
  if (!item.prevDayPx) return 0;
  return new BigNumber(item.markPx)
    .minus(new BigNumber(item.prevDayPx))
    .toNumber();
};

const calculateChange = (item: MarketData) => {
  if (!item.prevDayPx) return 0;
  return (
    ((Number(item.markPx) - Number(item.prevDayPx)) / Number(item.prevDayPx)) *
    100
  );
};

const MarketRowComponent = memo(
  ({ index, style, data }: MarketRowProps) => {
    const {
      items,
      favoritedCoins,
      lastFavoritedIndex,
      onSelectCoin,
      onToggleFavorite,
      setDropdownVisible,
      setSearchText,
    } = data;
    const marketItem = items[index];
    const isFavorited = favoritedCoins.includes(marketItem.name);
    const priceChange = calculateChange(marketItem);
    const priceChangeVal = calculateChangeValue(marketItem);
    const isPositive = priceChangeVal >= 0;
    const isLastFavorited =
      index === lastFavoritedIndex && lastFavoritedIndex >= 0;

    return (
      <div
        style={style}
        className={clsx(
          isLastFavorited && 'border-b border-solid border-rb-neutral-line'
        )}
      >
        <div
          className="flex items-center gap-[12px] px-[8px] h-full rounded-[4px] hover:bg-rb-neutral-bg-2 cursor-pointer"
          onClick={() => {
            onSelectCoin(marketItem.name);
            setDropdownVisible(false);
            setSearchText('');
          }}
        >
          {/* Left: Star + Logo + Symbol */}
          <div className="flex items-center gap-[8px] w-[180px] flex-shrink-0">
            <div
              className="flex items-center justify-center w-[16px] h-[16px] flex-shrink-0"
              onClick={(e) => onToggleFavorite(marketItem.name, e)}
            >
              {isFavorited ? (
                <RcIconStarFilled className="text-r-yellow-default" />
              ) : (
                <RcIconStar className="text-r-neutral-foot" />
              )}
            </div>
            <TokenImg
              logoUrl={marketItem.logoUrl}
              withDirection={false}
              size={20}
            />
            <div>
              <span className="text-[13px] font-medium text-r-neutral-title-1">
                {marketItem.name}
              </span>
              <span className="text-[13px] text-r-neutral-foot ml-4">
                {marketItem.maxLeverage}x
              </span>
            </div>
          </div>

          {/* Right: Data columns - 5 columns with custom widths */}
          <div className="flex flex-1">
            {/* Last Price */}
            <div className="text-[13px] text-r-neutral-title-1 text-start flex-1">
              ${splitNumberByStep(Number(marketItem.markPx))}
            </div>

            {/* 24h Change - 1.5x width */}
            <div
              className={clsx(
                'text-[13px] text-r-neutral-title-1 text-start flex-[1.5]'
              )}
            >
              {isPositive ? '+' : '-'}$
              {splitNumberByStep(Math.abs(priceChangeVal))}{' '}
              <span
                className={clsx(
                  isPositive ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)}%
              </span>
            </div>

            {/* 8hr Funding */}
            <div
              className={clsx(
                'text-[13px] text-r-neutral-title-1 text-start flex-1'
              )}
            >
              {formatPercent(Number(marketItem.funding), 4)}
            </div>

            {/* Volume */}
            <div className="text-[13px] text-r-neutral-title-1 text-start flex-1">
              {formatUsdValueKMB(Number(marketItem.dayNtlVlm))}
            </div>

            {/* Open Interest */}
            <div className="text-[13px] text-r-neutral-title-1 text-start flex-1">
              {formatUsdValueKMB(
                Number(marketItem.openInterest) * Number(marketItem.markPx)
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if the specific item data changed
    const prevItem = prevProps.data.items[prevProps.index];
    const nextItem = nextProps.data.items[nextProps.index];

    if (!prevItem || !nextItem) return false;

    // Check if this row is/was the last favorited (border changes)
    const prevIsLastFav = prevProps.index === prevProps.data.lastFavoritedIndex;
    const nextIsLastFav = nextProps.index === nextProps.data.lastFavoritedIndex;
    if (prevIsLastFav !== nextIsLastFav) return false;

    return (
      prevItem.name === nextItem.name &&
      prevItem.logoUrl === nextItem.logoUrl &&
      prevItem.markPx === nextItem.markPx &&
      prevItem.prevDayPx === nextItem.prevDayPx &&
      prevItem.funding === nextItem.funding &&
      prevItem.dayNtlVlm === nextItem.dayNtlVlm &&
      prevItem.openInterest === nextItem.openInterest &&
      prevItem.maxLeverage === nextItem.maxLeverage &&
      prevProps.data.favoritedCoins.includes(prevItem.name) ===
        nextProps.data.favoritedCoins.includes(nextItem.name) &&
      prevProps.index === nextProps.index
    );
  }
);

export const CoinDropdown: React.FC<CoinDropdownProps> = ({
  coin,
  onSelectCoin,
}) => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<SortField>('dayNtlVlm');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList>(null);
  const { marketData, favoritedCoins, marketDataMap } = useRabbySelector(
    (state) => state.perps
  );

  const marketItem = marketDataMap[coin.toUpperCase()];

  // Reset scroll position and search text when dropdown opens
  useEffect(() => {
    if (dropdownVisible) {
      setSearchText('');
      // Reset virtual list scroll position
      setTimeout(() => {
        listRef.current?.scrollTo(0);
      }, 0);
    }
  }, [dropdownVisible]);

  const handleToggleFavorite = (coinName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch.perps.toggleFavoriteCoin(coinName);
  };

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder(field === 'name' ? 'asc' : 'desc');
      }
    },
    [sortField, sortOrder]
  );

  const sortedAndFilteredData = useMemo(() => {
    const filtered = searchText
      ? marketData.filter((item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase())
        )
      : [...marketData];

    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'markPx':
          aValue = Number(a.markPx);
          bValue = Number(b.markPx);
          break;
        case 'change':
          aValue = calculateChange(a);
          bValue = calculateChange(b);
          break;
        case 'funding':
          aValue = Number(a.funding);
          bValue = Number(b.funding);
          break;
        case 'dayNtlVlm':
          aValue = Number(a.dayNtlVlm);
          bValue = Number(b.dayNtlVlm);
          break;
        case 'openInterest':
          aValue = Number(a.openInterest) * Number(a.markPx);
          bValue = Number(b.openInterest) * Number(b.markPx);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    // Separate favorited coins
    const favorited = filtered.filter((item) =>
      favoritedCoins.includes(item.name)
    );
    const others = filtered.filter(
      (item) => !favoritedCoins.includes(item.name)
    );

    // Merge into single list (favorited first, then others)
    return [...favorited, ...others];
  }, [marketData, searchText, sortField, sortOrder, favoritedCoins]);

  // Calculate last favorited index for border display
  const lastFavoritedIndex = useMemo(() => {
    const favCount = sortedAndFilteredData.filter((item) =>
      favoritedCoins.includes(item.name)
    ).length;
    // Only show border if there are both favorited and non-favorited items
    const hasNonFavorited = sortedAndFilteredData.some(
      (item) => !favoritedCoins.includes(item.name)
    );
    return favCount > 0 && hasNonFavorited ? favCount - 1 : -1;
  }, [sortedAndFilteredData, favoritedCoins]);

  // Memoized item data to prevent unnecessary re-renders
  const itemData = useMemo(
    () => ({
      items: sortedAndFilteredData,
      favoritedCoins,
      lastFavoritedIndex,
      onSelectCoin,
      onToggleFavorite: handleToggleFavorite,
      setDropdownVisible,
      setSearchText,
    }),
    [sortedAndFilteredData, favoritedCoins, lastFavoritedIndex, onSelectCoin]
  );

  const renderSortIcon = useCallback(
    (field: SortField) => {
      if (sortField !== field) return null;
      return (
        <span className="ml-[4px]">{sortOrder === 'asc' ? '↑' : '↓'}</span>
      );
    },
    [sortField, sortOrder]
  );

  const dropdownMenu = useMemo(
    () => (
      <div className="bg-rb-neutral-bg-1 rounded-[8px] shadow-lg border border-solid border-rb-neutral-line w-[800px] h-[480px] overflow-hidden flex flex-col px-16 pt-16">
        <SearchInput
          prefix={<RcIconSearch className="text-r-neutral-foot" />}
          placeholder={t('page.perpsPro.chatArea.searchMarkets')}
          value={searchText}
          spellCheck={false}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <div className="flex items-center gap-[12px] px-[8px] py-[12px]">
          <div
            className={clsx(
              'text-[13px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 hover:font-medium transition-colors w-[180px] flex-shrink-0',
              sortField === 'name' && 'text-r-neutral-title-1 font-medium'
            )}
            onClick={() => handleSort('name')}
          >
            {t('page.perpsPro.chatArea.symbol')}
            {renderSortIcon('name')}
          </div>

          <div className="flex flex-1">
            <div
              className={clsx(
                'text-[13px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 hover:font-medium transition-colors text-start flex-1',
                sortField === 'markPx' && 'text-r-neutral-title-1 font-medium'
              )}
              onClick={() => handleSort('markPx')}
            >
              {t('page.perpsPro.chatArea.lastPrice')}
              {renderSortIcon('markPx')}
            </div>
            <div
              className={clsx(
                'text-[13px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 hover:font-medium transition-colors text-start flex-[1.5]',
                sortField === 'change' && 'text-r-neutral-title-1 font-medium'
              )}
              onClick={() => handleSort('change')}
            >
              {t('page.perpsPro.chatArea.24hChange')}
              {renderSortIcon('change')}
            </div>
            <div
              className={clsx(
                'text-[13px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 hover:font-medium transition-colors text-start flex-1',
                sortField === 'funding' && 'text-r-neutral-title-1 font-medium'
              )}
              onClick={() => handleSort('funding')}
            >
              {t('page.perpsPro.chatArea.8hrFunding')}
              {renderSortIcon('funding')}
            </div>
            <div
              className={clsx(
                'text-[13px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 hover:font-medium transition-colors text-start flex-1',
                sortField === 'dayNtlVlm' &&
                  'text-r-neutral-title-1 font-medium'
              )}
              onClick={() => handleSort('dayNtlVlm')}
            >
              {t('page.perpsPro.chatArea.volume')}
              {renderSortIcon('dayNtlVlm')}
            </div>
            <div
              className={clsx(
                'text-[13px] text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1 hover:font-medium  transition-colors text-start flex-1',
                sortField === 'openInterest' &&
                  'text-r-neutral-title-1 font-medium'
              )}
              onClick={() => handleSort('openInterest')}
            >
              {t('page.perpsPro.chatArea.openInterest')}
              {renderSortIcon('openInterest')}
            </div>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1">
          <FixedSizeList
            ref={listRef}
            width="100%"
            height={350}
            itemCount={sortedAndFilteredData.length}
            itemData={itemData}
            itemSize={ROW_HEIGHT}
            className="trades-container-no-scrollbar"
          >
            {MarketRowComponent}
          </FixedSizeList>
        </div>
      </div>
    ),
    [
      sortedAndFilteredData,
      sortField,
      sortOrder,
      searchText,
      itemData,
      renderSortIcon,
      handleSort,
      t,
    ]
  );

  return (
    <Dropdown
      overlay={dropdownMenu}
      // trigger={['click']}
      transitionName=""
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      placement="bottomLeft"
    >
      <div className="mr-32 flex items-center gap-[8px] cursor-pointer transition-colors py-[4px] rounded-[6px] min-w-[90px] justify-center">
        <TokenImg
          logoUrl={marketItem?.logoUrl || ''}
          withDirection={false}
          size={24}
        />
        <div className="text-[20px] leading-[24px] font-bold text-r-neutral-title-1">
          {coin}
        </div>
        <RcIconArrowDown className="text-r-neutral-secondary" />
      </div>
    </Dropdown>
  );
};
