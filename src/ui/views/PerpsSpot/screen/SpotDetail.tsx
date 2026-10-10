import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Button } from 'antd';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/ui/component';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { usePerpsState } from '@/ui/views/Perps/hooks/usePerpsState';
import { PerpsLoading } from '@/ui/views/Perps/components/Loading';
import { SpotTokenLogo } from '../components/SpotTokenLogo';
import { SpotSparkline } from '../components/SpotSparkline';
import { SpotOpenOrderRow } from '../components/SpotOpenOrderRow';
import { SpotOrderPopup } from '../components/SpotOrderPopup';
import {
  formatSpotPctChange,
  formatSpotVolume,
  getSpotChangeColorClass,
} from '../components/format';
import { usePerpsSpotData } from '../hooks/usePerpsSpotData';
import { useSpotOrderCancel } from '../hooks/useSpotOrderCancel';
import {
  SPOT_SPARKLINE_RANGES,
  useSpotSparkline,
} from '../hooks/useSpotSparkline';
import type { SpotSparklineRange } from '../hooks/useSpotSparkline';
import {
  buildSpotOpenOrderItems,
  formatSpotPrice,
  formatSpotSize,
  getSpotFavoriteKey,
  getSpotMarket24hChange,
  getSpotTokenBalance,
  isSpotMarketFavorite,
  SPOT_MIN_ORDER_NOTIONAL,
} from '../utils/spotMarkets';
import type { SpotOrderSide } from '../utils/spotMarkets';
import { perpsSpotPaths } from '../navigation';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="text-15 font-semibold text-r-neutral-title-1 flex items-center gap-6">
    <span className="w-[2px] h-[12px] bg-r-blue-default inline-block" />
    {children}
  </div>
);

export const PerpsSpotDetail: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const { pairIndex: pairIndexParam } = useParams<{ pairIndex: string }>();
  const pairIndex = Number(pairIndexParam);
  const { hasPermission } = usePerpsState({});
  const favoritedCoins = useRabbySelector((s) => s.perps.favoritedCoins);
  const {
    markets,
    midsUpdatedAt,
    isLoading,
    account,
    currentPerpsAccount,
    refresh,
  } = usePerpsSpotData({ withAccount: true });
  const market = useMemo(
    () => markets.find((item) => item.pairIndex === pairIndex) ?? null,
    [markets, pairIndex]
  );

  const [range, setRange] = useState<SpotSparklineRange>('1d');
  const { closes } = useSpotSparkline(market?.coin ?? null, range);
  const [popupSide, setPopupSide] = useState<SpotOrderSide | null>(null);
  const canTrade = !!currentPerpsAccount && hasPermission;
  const { cancel, cancellingOid } = useSpotOrderCancel(refresh);

  // `?side=sell` (from the portfolio) opens the order form right away.
  useEffect(() => {
    const side = new URLSearchParams(location.search).get('side');
    if (side === 'buy' || side === 'sell') {
      setPopupSide(side);
    }
  }, [location.search]);

  const orderItems = useMemo(
    () =>
      market && account
        ? buildSpotOpenOrderItems(account.openOrders, [market])
        : [],
    [market, account]
  );

  const header = (
    <PageHeader className="mx-[20px] pt-[20px]" forceShowBack>
      {market ? (
        <span className="flex items-center justify-center gap-6">
          <SpotTokenLogo baseName={market.baseName} size={24} />
          {market.baseName} / {market.quoteName}
        </span>
      ) : null}
    </PageHeader>
  );

  if (!market) {
    return (
      <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
        {header}
        {isLoading ? (
          <PerpsLoading />
        ) : (
          <div className="pt-40 text-center text-13 text-r-neutral-foot">
            {t('page.perpsSpot.empty')}
          </div>
        )}
      </div>
    );
  }

  const change = getSpotMarket24hChange(market);
  const changeAbs =
    market.midPx && market.prevDayPx
      ? formatSpotPrice(
          new BigNumber(market.midPx).minus(market.prevDayPx).abs(),
          market.szDecimals
        )
      : null;
  const isFavorite = isSpotMarketFavorite(favoritedCoins, market);
  const baseBalance = getSpotTokenBalance(
    account?.balances,
    market.baseTokenIndex
  );
  const quoteBalance = getSpotTokenBalance(
    account?.balances,
    market.quoteTokenIndex
  );
  const errorText = !currentPerpsAccount
    ? t('page.perpsSpot.loginRequired')
    : !hasPermission
    ? t('page.perps.permissionTips')
    : null;

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] relative"
        forceShowBack
        rightSlot={
          <div
            className={clsx(
              'absolute right-0 top-[50%] translate-y-[-50%] text-20 leading-none cursor-pointer',
              isFavorite ? 'text-r-orange-default' : 'text-r-neutral-foot'
            )}
            title={t(
              isFavorite
                ? 'page.perpsSpot.removeFavorite'
                : 'page.perpsSpot.addFavorite'
            )}
            onClick={() =>
              dispatch.perps.toggleFavoriteCoin(getSpotFavoriteKey(market))
            }
          >
            {isFavorite ? '★' : '☆'}
          </div>
        }
      >
        <span className="flex items-center justify-center gap-6">
          <SpotTokenLogo baseName={market.baseName} size={24} />
          {market.baseName} / {market.quoteName}
        </span>
      </PageHeader>

      <div className="flex-1 overflow-auto px-20 pb-20">
        <div className="text-[28px] leading-[34px] font-bold text-r-neutral-title-1">
          {market.midPx
            ? formatSpotPrice(market.midPx, market.szDecimals)
            : '-'}
        </div>
        <div className={clsx('mt-4 text-13', getSpotChangeColorClass(change))}>
          {changeAbs
            ? `${
                change && change < 0 ? '-' : '+'
              }${changeAbs} (${formatSpotPctChange(change)})`
            : formatSpotPctChange(change)}
          <span className="text-r-neutral-foot">
            {'  '}
            {t('page.perpsSpot.change24h')}
          </span>
        </div>

        <div className="mt-16">
          <SpotSparkline closes={closes} />
          <div className="mt-8 flex gap-8">
            {SPOT_SPARKLINE_RANGES.map((item) => (
              <div
                key={item}
                className={clsx(
                  'flex-1 h-[28px] flex items-center justify-center rounded-[6px] text-12 font-medium cursor-pointer',
                  range === item
                    ? 'bg-r-blue-light-1 text-r-blue-default'
                    : 'bg-r-neutral-card1 text-r-neutral-body'
                )}
                onClick={() => setRange(item)}
              >
                {t(`page.perpsSpot.range.${item}`)}
              </div>
            ))}
          </div>
        </div>

        {currentPerpsAccount ? (
          <div className="mt-20">
            <SectionTitle>{t('page.perpsSpot.yourBalances')}</SectionTitle>
            <div className="mt-8 px-16 py-12 rounded-[8px] bg-r-neutral-card1 flex flex-col gap-8 text-13">
              <div className="flex items-center justify-between">
                <span className="text-r-neutral-title-1 font-medium">
                  {formatSpotSize(baseBalance.total, market.szDecimals)}{' '}
                  {market.baseName}
                </span>
                <span className="text-r-neutral-foot">
                  ≈{' '}
                  {market.midPx
                    ? new BigNumber(baseBalance.total)
                        .times(market.midPx)
                        .toFixed(2)
                    : '-'}{' '}
                  {market.quoteName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-r-neutral-title-1 font-medium">
                  {new BigNumber(quoteBalance.available).toFixed(
                    2,
                    BigNumber.ROUND_DOWN
                  )}{' '}
                  {market.quoteName}
                </span>
                <span className="text-r-neutral-foot">
                  {t('page.perpsSpot.availableSuffix')}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-20">
          <div className="flex items-center justify-between">
            <SectionTitle>
              {t('page.perpsSpot.openOrders')}
              {orderItems.length ? ` (${orderItems.length})` : ''}
            </SectionTitle>
            {currentPerpsAccount ? (
              <div
                className="text-13 font-medium text-r-neutral-foot hover:text-r-blue-default cursor-pointer"
                onClick={() => history.push(perpsSpotPaths.portfolio)}
              >
                {t('page.perpsSpot.allOrders')}
              </div>
            ) : null}
          </div>
          <div className="mt-8 flex flex-col gap-8">
            {orderItems.length ? (
              orderItems.map((item) => (
                <SpotOpenOrderRow
                  key={item.order.oid}
                  order={item.order}
                  market={item.market}
                  cancelling={cancellingOid === item.order.oid}
                  cancelDisabled={cancellingOid !== null || !canTrade}
                  onCancel={cancel}
                />
              ))
            ) : (
              <div className="py-12 text-center text-13 text-r-neutral-foot">
                {t('page.perpsSpot.noOpenOrders')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-20 px-16 py-12 rounded-[8px] bg-r-neutral-card1 flex flex-col gap-8 text-13">
          <div className="flex items-center justify-between">
            <span className="text-r-neutral-foot">
              {t('page.perpsSpot.volume24h')}
            </span>
            <span className="text-r-neutral-title-1">
              {formatSpotVolume(market.dayNtlVlm)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-r-neutral-foot">
              {t('page.perpsSpot.minOrder')}
            </span>
            <span className="text-r-neutral-title-1">
              {SPOT_MIN_ORDER_NOTIONAL} {market.quoteName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-r-neutral-foot">
              {t('page.perpsSpot.precision')}
            </span>
            <span className="text-r-neutral-title-1">
              {new BigNumber(10).pow(-market.szDecimals).toFixed()}{' '}
              {market.baseName}
            </span>
          </div>
        </div>
      </div>

      <div className="px-20 py-16 border-t border-solid border-rabby-neutral-line">
        {errorText ? (
          <div className="mb-8 text-13 text-center text-r-red-default">
            {errorText}
          </div>
        ) : null}
        <div className="flex gap-12">
          <Button
            size="large"
            type="primary"
            disabled={!canTrade}
            className={clsx(
              'h-[48px] border-none text-15 font-medium rounded-[8px] flex-1 bg-r-green-default text-r-neutral-title-2',
              !canTrade && 'opacity-50'
            )}
            onClick={() => setPopupSide('buy')}
          >
            {t('page.perpsSpot.buy')}
          </Button>
          <Button
            size="large"
            type="primary"
            disabled={!canTrade}
            className={clsx(
              'h-[48px] border-none text-15 font-medium rounded-[8px] flex-1 bg-r-red-default text-r-neutral-title-2',
              !canTrade && 'opacity-50'
            )}
            onClick={() => setPopupSide('sell')}
          >
            {t('page.perpsSpot.sell')}
          </Button>
        </div>
      </div>

      <SpotOrderPopup
        visible={popupSide !== null && canTrade}
        side={popupSide ?? 'buy'}
        market={market}
        balances={account?.balances ?? null}
        midsUpdatedAt={midsUpdatedAt}
        hasAccount={!!currentPerpsAccount}
        canTrade={canTrade}
        onClose={() => setPopupSide(null)}
        onSubmitted={refresh}
        refreshPrices={refresh}
      />
    </div>
  );
};

export default PerpsSpotDetail;
