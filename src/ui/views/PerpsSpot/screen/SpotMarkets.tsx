import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Input } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { PageHeader } from '@/ui/component';
import { ReactComponent as RcIconHyperLogo } from '@/ui/assets/perps/IconHyperLogo.svg';
import { useRabbySelector } from '@/ui/store';
import { usePerpsState } from '@/ui/views/Perps/hooks/usePerpsState';
import { PerpsLoading } from '@/ui/views/Perps/components/Loading';
import { PerpsModeTabs } from '../components/PerpsModeTabs';
import { SpotMarketRow } from '../components/SpotMarketRow';
import { usePerpsSpotData } from '../hooks/usePerpsSpotData';
import {
  buildSpotOpenOrderItems,
  filterSpotMarkets,
  filterSpotMarketsByTab,
  getSpotHeldTokenIndexes,
  sortSpotMarkets,
} from '../utils/spotMarkets';
import type {
  SpotMarket,
  SpotMarketFilter,
  SpotMarketSort,
} from '../utils/spotMarkets';
import { leavePerpsSpot, perpsSpotPaths } from '../navigation';

const FILTERS: SpotMarketFilter[] = ['all', 'holdings', 'favorites'];

export const PerpsSpotMarkets: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  // Restores the Perps session when this page is opened directly.
  const { isLogin } = usePerpsState({});
  const favoritedCoins = useRabbySelector((s) => s.perps.favoritedCoins);
  const { markets, isLoading, isError, account } = usePerpsSpotData({
    withAccount: true,
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SpotMarketFilter>('all');
  const [sort, setSort] = useState<SpotMarketSort>('volume');

  const balances = account?.balances ?? null;
  const heldTokenIndexes = useMemo(() => getSpotHeldTokenIndexes(balances), [
    balances,
  ]);
  const heldTotals = useMemo(() => {
    const map = new Map<number, string>();
    balances?.forEach((balance) => map.set(balance.token, balance.total));
    return map;
  }, [balances]);
  const openOrderCount = useMemo(
    () =>
      account ? buildSpotOpenOrderItems(account.openOrders, markets).length : 0,
    [account, markets]
  );

  const list = useMemo(
    () =>
      filterSpotMarkets(
        filterSpotMarketsByTab(sortSpotMarkets(markets, sort), filter, {
          heldTokenIndexes,
          favoriteMarkets: favoritedCoins,
        }),
        search
      ),
    [markets, sort, filter, heldTokenIndexes, favoritedCoins, search]
  );

  const openMarket = (market: SpotMarket) => {
    history.push(perpsSpotPaths.trade(market.pairIndex));
  };

  const emptyText =
    filter === 'favorites'
      ? t('page.perpsSpot.noFavorites')
      : filter === 'holdings'
      ? t('page.perpsSpot.noHoldings')
      : t('page.perpsSpot.empty');

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] relative"
        forceShowBack
        onBack={() => leavePerpsSpot(history, location)}
        rightSlot={
          isLogin ? (
            <div
              className="absolute right-0 top-[20px] bottom-0 flex items-center gap-4 text-13 font-medium text-r-blue-default cursor-pointer"
              onClick={() => history.push(perpsSpotPaths.portfolio)}
            >
              {t('page.perpsSpot.portfolioEntry')}
              {openOrderCount > 0 ? (
                <span className="min-w-[16px] h-[16px] px-4 rounded-full bg-r-blue-default text-r-neutral-title-2 text-11 flex items-center justify-center">
                  {openOrderCount}
                </span>
              ) : null}
            </div>
          ) : null
        }
      >
        <span className="flex items-center justify-center gap-6">
          <RcIconHyperLogo className="w-[20px] h-[20px]" />
          <PerpsModeTabs
            activeMode="spot"
            onSelectPerps={() => leavePerpsSpot(history, location)}
            onSelectSpot={() => undefined}
          />
        </span>
      </PageHeader>

      <div className="mx-20 flex flex-col gap-12 pb-12">
        <Input
          className="h-[40px] rounded-[8px]"
          allowClear
          placeholder={t('page.perpsSpot.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            {FILTERS.map((item) => {
              const disabled = item === 'holdings' && !isLogin;
              return (
                <div
                  key={item}
                  className={clsx(
                    'px-10 h-[28px] flex items-center rounded-[6px] text-13 font-medium',
                    filter === item
                      ? 'bg-r-blue-light-1 text-r-blue-default'
                      : 'bg-r-neutral-card1 text-r-neutral-body',
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  )}
                  onClick={() => !disabled && setFilter(item)}
                >
                  {item === 'favorites' ? '★ ' : ''}
                  {t(`page.perpsSpot.filter.${item}`)}
                </div>
              );
            })}
          </div>
          <div
            className="text-13 font-medium text-r-neutral-foot cursor-pointer hover:text-r-blue-default"
            onClick={() => setSort(sort === 'volume' ? 'name' : 'volume')}
          >
            {t(`page.perpsSpot.sort.${sort}`)}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden mx-20">
        {isLoading ? (
          isError ? (
            <div className="pt-40 text-center text-13 text-r-neutral-foot">
              {t('page.perpsSpot.loadError')}
            </div>
          ) : (
            <PerpsLoading />
          )
        ) : list.length ? (
          <Virtuoso
            style={{ height: '100%' }}
            data={list}
            itemContent={(_, market) => (
              <div className="pb-8">
                <SpotMarketRow
                  market={market}
                  heldTotal={heldTotals.get(market.baseTokenIndex)}
                  onClick={openMarket}
                />
              </div>
            )}
          />
        ) : (
          <div className="pt-40 text-center text-13 text-r-neutral-foot">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerpsSpotMarkets;
