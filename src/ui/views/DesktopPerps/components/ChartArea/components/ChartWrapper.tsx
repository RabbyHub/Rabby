import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import {
  normalizeTradingViewLocale,
  TradingViewIframeChart,
} from '@/ui/views/Perps/components/TradingViewIframeChart';
import { formatPerpsCoin } from '../../../utils';

interface ChartWrapperProps {
  coin: string;
  interval: string;
  onIntervalChange?: (interval: string) => void;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  coin,
  interval: propInterval,
  onIntervalChange,
}) => {
  const {
    marketDataMap,
    clearinghouseState,
    openOrders,
    sizeDisplayUnit,
  } = useRabbySelector((state) => state.perps);
  const { isDarkTheme } = useThemeMode();
  const { i18n } = useTranslation();

  const currentMarketData = useMemo(() => {
    return marketDataMap[coin] || {};
  }, [marketDataMap, coin]);

  const pxDecimals = useMemo(() => {
    return currentMarketData.pxDecimals || 2;
  }, [currentMarketData]);

  const lineTagInfo = useMemo(() => {
    const quoteAsset = currentMarketData.quoteAsset || 'USDC';
    const baseAsset = formatPerpsCoin(currentMarketData.displayName || coin);
    const markPrice = Number(currentMarketData.markPx || 0);
    const currentPosition = clearinghouseState?.assetPositions.find(
      (item) => item.position.coin === coin
    )?.position;
    const formatSize = (size?: string | number, price?: string | number) => {
      const sizeBn = new BigNumber(size || 0).abs();
      if (sizeBn.isZero()) return '';

      if (sizeDisplayUnit === 'usd') {
        const sizePrice = Number(price || markPrice || 0);
        if (!Number.isFinite(sizePrice) || sizePrice <= 0) return '';

        return `${splitNumberByStep(
          sizeBn.times(sizePrice).toFixed(2)
        )} ${quoteAsset}`;
      }

      return `${splitNumberByStep(sizeBn.toString())} ${baseAsset}`;
    };
    const firstPositiveValue = (
      ...values: Array<string | number | undefined | null>
    ): string | number | undefined => {
      for (const value of values) {
        if (value === null || value === undefined) continue;
        const valueBn = new BigNumber(value || 0);
        if (valueBn.isFinite() && valueBn.gt(0)) {
          return value;
        }
      }

      return undefined;
    };
    const firstNonZeroValue = (
      ...values: Array<string | number | undefined | null>
    ): string | number | undefined => {
      for (const value of values) {
        if (value === null || value === undefined) continue;
        const valueBn = new BigNumber(value || 0);
        if (valueBn.isFinite() && !valueBn.isZero()) {
          return value;
        }
      }

      return undefined;
    };
    const isTriggerOrder = (order: typeof openOrders[number]) => {
      const orderType = String(order.orderType || '').toLowerCase();
      return (
        !!order.isTrigger ||
        orderType.includes('trigger') ||
        orderType.includes('stop') ||
        orderType.includes('take profit')
      );
    };
    const getOrderLinePrice = (order: typeof openOrders[number]) => {
      const price = isTriggerOrder(order)
        ? firstPositiveValue(order.triggerPx, order.limitPx)
        : firstPositiveValue(order.limitPx, order.triggerPx);

      return Number(price || 0);
    };
    const getOrderSize = (order: typeof openOrders[number]) => {
      const explicitSize = firstPositiveValue(order.sz, order.origSz);
      if (explicitSize) return explicitSize;

      if (isTriggerOrder(order)) {
        return firstNonZeroValue(currentPosition?.szi);
      }

      return undefined;
    };
    const currentOrders = openOrders
      .filter((order) => {
        if (order.coin !== coin) return false;

        const orderType = String(order.orderType || '').toLowerCase();
        return !orderType.includes('twap');
      })
      .map((order) => {
        const linePrice = getOrderLinePrice(order);

        return {
          id: order.oid,
          oid: order.oid,
          side: order.side,
          orderType: order.orderType,
          triggerCondition: order.triggerCondition,
          isTrigger: order.isTrigger,
          price: linePrice,
          limitPx: order.limitPx,
          triggerPx: order.triggerPx,
          sz: order.sz,
          origSz: order.origSz,
          size: formatSize(getOrderSize(order), linePrice),
        };
      });
    const liquidationPrice = currentPosition?.liquidationPx;
    const entryPrice = currentPosition?.entryPx;

    return {
      liquidationPrice: Number(
        Number(liquidationPrice || 0).toFixed(pxDecimals)
      ),
      entryPrice: Number(entryPrice || 0),
      currentOrders,
      position: currentPosition
        ? {
            entryPrice: Number(entryPrice || 0),
            avgPrice: Number(entryPrice || 0),
            pnl: currentPosition.unrealizedPnl,
            unrealizedPnl: currentPosition.unrealizedPnl,
            size: formatSize(currentPosition.szi, currentMarketData.markPx),
            sz: formatSize(currentPosition.szi, currentMarketData.markPx),
            szi: currentPosition.szi,
            liquidationPrice: Number(
              Number(liquidationPrice || 0).toFixed(pxDecimals)
            ),
            liquidationPx: Number(
              Number(liquidationPrice || 0).toFixed(pxDecimals)
            ),
          }
        : undefined,
    };
  }, [
    coin,
    openOrders,
    clearinghouseState,
    pxDecimals,
    currentMarketData,
    sizeDisplayUnit,
  ]);

  const chartLocale = useMemo(() => {
    return normalizeTradingViewLocale(i18n.language);
  }, [i18n.language]);
  const chartTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
  }, []);
  const desktopWidgetConfig = useMemo(() => {
    return {
      disabled_features: [
        'symbol_search_hot_key',
        'header_symbol_search',
        'header_saveload',
        'header_quick_search',
        'header_settings',
        'header_layouttoggle',
        'legend_inplace_edit',
        'volume_force_overlay',
        'widget_logo',
        'header_compare',
        'right_toolbar',
        'trading_account_manager',
        'header_screenshot',
      ],
      enabled_features: [
        'iframe_loading_compatibility_mode',
        'hide_left_toolbar_by_default',
      ],
      favorites: {
        intervals: ['15', '60', '240', '1D', '1W'],
      },
      time_frames: [],
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-rb-neutral-bg-1">
      <div className="flex-1 min-h-0">
        <TradingViewIframeChart
          coin={coin}
          interval={propInterval as any}
          pxDecimals={pxDecimals}
          isDarkTheme={isDarkTheme}
          locale={chartLocale}
          timezone={chartTimezone}
          lineTagInfo={lineTagInfo}
          widgetConfig={desktopWidgetConfig}
          onIntervalChange={onIntervalChange}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
