import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Empty } from 'antd';
import { sortBy } from 'lodash';
import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';
import clsx from 'clsx';
import { formatNumber, formatUsdValue, splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Popup } from '@/ui/component';
import { AssetItem } from '../components/AssetMetaItem';
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
}

export const SearchPerpsPopup: React.FC<SearchPerpsPopupProps> = ({
  visible,
  openFromSource,
  onCancel,
  marketData,
  positionAndOpenOrders,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    return sortBy(marketData, (item) => -(item.dayNtlVlm || 0));
  }, [marketData]);

  const filteredList = useMemo(() => {
    if (!search) {
      return list;
    }

    return (
      list.filter((item) => {
        return item.name.toUpperCase().includes(search.toUpperCase());
      }) || []
    );
  }, [list, search]);

  const positionCoinSet = useMemo(() => {
    const set = new Set();
    positionAndOpenOrders?.forEach((order) => {
      set.add(order.position.coin);
    });
    return set;
  }, [positionAndOpenOrders]);

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
        <div className="text-20 font-medium text-r-neutral-title-1 text-center my-12">
          {openFromSource === 'openPosition'
            ? t('page.perps.searchPerpsPopup.openPosition')
            : t('page.perps.searchPerpsPopup.searchPerps')}
        </div>
        <div className="px-20 mb-16">
          <SearchInput
            prefix={<SearchSVG className="w-[14px] h-[14px]" />}
            placeholder={
              openFromSource === 'openPosition'
                ? t('page.perps.searchPerpsPopup.searchPosition')
                : t('page.perps.searchPerpsPopup.searchPlaceholder')
            }
            className={clsx(
              'text-12 text-black py-0 px-[9px] h-[32px]',
              'rounded-[6px]',
              'transform-none'
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="flex-1 overflow-y-auto px-20">
          {filteredList.length === 0 ? (
            <Empty
              description={t('page.perps.searchPerpsPopup.empty')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div className="flex flex-col gap-8">
              {filteredList.map((item) => {
                const hasPosition = positionCoinSet.has(item.name);
                return (
                  <AssetItem
                    key={item.name}
                    item={item}
                    hasPosition={hasPosition}
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
