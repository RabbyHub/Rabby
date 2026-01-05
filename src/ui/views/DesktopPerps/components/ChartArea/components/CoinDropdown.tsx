import React, { useState, useMemo, useCallback } from 'react';
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

const SearchInput = styled(Input)`
  background-color: var(--r-neutral-card1, #fff) !important;
  &.ant-input-affix-wrapper-focused {
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  .ant-input {
    background-color: transparent !important;
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

type SortField =
  | 'name'
  | 'markPx'
  | 'change'
  | 'funding'
  | 'dayNtlVlm'
  | 'openInterest';
type SortOrder = 'asc' | 'desc';

export const CoinDropdown: React.FC<CoinDropdownProps> = ({
  coin,
  onSelectCoin,
}) => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [sortField, setSortField] = useState<SortField>('openInterest');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const { marketData, favoritedCoins, marketDataMap } = useRabbySelector(
    (state) => state.perps
  );

  const marketItem = marketDataMap[coin.toUpperCase()];

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

  const calculateChangeValue = (item: MarketData) => {
    if (!item.prevDayPx) return 0;
    return new BigNumber(item.markPx)
      .minus(new BigNumber(item.prevDayPx))
      .toNumber();
  };

  const calculateChange = (item: MarketData) => {
    if (!item.prevDayPx) return 0;
    return (
      ((Number(item.markPx) - Number(item.prevDayPx)) /
        Number(item.prevDayPx)) *
      100
    );
  };

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

    return { favorited, others };
  }, [marketData, searchText, sortField, sortOrder, favoritedCoins]);

  const renderMarketRow = useCallback(
    (item: MarketData) => {
      const isFavorited = favoritedCoins.includes(item.name);
      const priceChange = calculateChange(item);
      const priceChangeVal = calculateChangeValue(item);
      const isPositive = priceChangeVal >= 0;

      return (
        <div
          key={item.name}
          className={clsx(
            'flex items-center gap-[12px] px-[8px] rounded-[4px] py-[12px] hover:bg-rb-neutral-bg-2 cursor-pointer transition-colors',
            'hover:bg-rb-neutral-bg-2'
          )}
          onClick={() => {
            onSelectCoin(item.name);
            setDropdownVisible(false);
            setSearchText('');
          }}
        >
          {/* Left: Star + Logo + Symbol */}
          <div className="flex items-center gap-[8px] w-[180px] flex-shrink-0">
            <div
              className="flex items-center justify-center w-[16px] h-[16px] flex-shrink-0"
              onClick={(e) => handleToggleFavorite(item.name, e)}
            >
              {isFavorited ? (
                <RcIconStarFilled className="text-r-yellow-default" />
              ) : (
                <RcIconStar className="text-r-neutral-foot" />
              )}
            </div>
            <TokenImg logoUrl={item.logoUrl} withDirection={false} size={20} />
            <div>
              <span className="text-[13px] font-medium text-r-neutral-title-1">
                {item.name}
              </span>
              <span className="text-[13px] text-r-neutral-foot ml-4">
                {item.maxLeverage}x
              </span>
            </div>
          </div>

          {/* Right: Data columns - 5 columns with custom widths */}
          <div className="flex flex-1">
            {/* Last Price */}
            <div className="text-[13px] text-r-neutral-title-1 text-start flex-1">
              ${splitNumberByStep(Number(item.markPx))}
            </div>

            {/* 24h Change - 1.5x width */}
            <div
              className={clsx(
                'text-[13px text-r-neutral-title-1  text-start flex-[1.5]'
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
                'text-[13px] text-r-neutral-title-1  text-start flex-1'
              )}
            >
              {formatPercent(Number(item.funding), 4)}
            </div>

            {/* Volume */}
            <div className="text-[13px] text-r-neutral-title-1 text-start flex-1">
              {formatUsdValueKMB(Number(item.dayNtlVlm))}
            </div>

            {/* Open Interest */}
            <div className="text-[13px] text-r-neutral-title-1 text-start flex-1">
              {formatUsdValueKMB(
                Number(item.openInterest) * Number(item.markPx)
              )}
            </div>
          </div>
        </div>
      );
    },
    [favoritedCoins, onSelectCoin, setDropdownVisible, setSearchText]
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

        <div className="overflow-y-auto flex-1">
          {sortedAndFilteredData.favorited.length > 0 && (
            <>
              {sortedAndFilteredData.favorited.map((item) =>
                renderMarketRow(item)
              )}
              {sortedAndFilteredData.others.length > 0 && (
                <div className="px-8">
                  <div className="h-[8px] bg-rb-neutral-bg-1  border-b border-solid border-rb-neutral-line"></div>
                  <div className="h-[8px] bg-rb-neutral-bg-1"></div>
                </div>
              )}
            </>
          )}

          {sortedAndFilteredData.others.map((item) => renderMarketRow(item))}
        </div>
      </div>
    ),
    [
      sortedAndFilteredData,
      sortField,
      sortOrder,
      searchText,
      renderMarketRow,
      renderSortIcon,
      handleSort,
      t,
    ]
  );

  return (
    <Dropdown
      overlay={dropdownMenu}
      // trigger={['click']}
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      placement="bottomLeft"
    >
      <div className="flex items-center gap-[8px] cursor-pointer transition-colors px-[8px] py-[4px] rounded-[6px]">
        <TokenImg
          logoUrl={marketItem?.logoUrl || ''}
          withDirection={false}
          size={24}
        />
        <div className="text-[20px] leading-[24px] font-bold text-r-neutral-title-1">
          {coin}
        </div>
        <RcIconArrowDown className="text-r-neutral-secondary w-[20px] h-[20px]" />
      </div>
    </Dropdown>
  );
};
