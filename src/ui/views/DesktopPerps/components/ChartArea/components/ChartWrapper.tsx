import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';
import {
  normalizeTradingViewLocale,
  TradingViewIframeChart,
} from '@/ui/views/Perps/components/TradingViewIframeChart';

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
  const { marketDataMap, clearinghouseState, openOrders } = useRabbySelector(
    (state) => state.perps
  );
  const { isDarkTheme } = useThemeMode();
  const { i18n } = useTranslation();

  const currentMarketData = useMemo(() => {
    return marketDataMap[coin] || {};
  }, [marketDataMap, coin]);

  const pxDecimals = useMemo(() => {
    return currentMarketData.pxDecimals || 2;
  }, [currentMarketData]);

  const lineTagInfo = useMemo(() => {
    const tpPrice = openOrders.find(
      (order) =>
        order.coin === coin &&
        order.orderType === 'Take Profit Market' &&
        order.isTrigger &&
        order.reduceOnly
    )?.triggerPx;
    const slPrice = openOrders.find(
      (order) =>
        order.coin === coin &&
        order.orderType === 'Stop Market' &&
        order.isTrigger &&
        order.reduceOnly
    )?.triggerPx;
    const liquidationPrice = clearinghouseState?.assetPositions.find(
      (item) => item.position.coin === coin
    )?.position.liquidationPx;
    const entryPrice = clearinghouseState?.assetPositions.find(
      (item) => item.position.coin === coin
    )?.position.entryPx;
    return {
      tpPrice: Number(tpPrice || 0),
      slPrice: Number(slPrice || 0),
      liquidationPrice: Number(
        Number(liquidationPrice || 0).toFixed(pxDecimals)
      ),
      entryPrice: Number(entryPrice || 0),
    };
  }, [coin, openOrders, clearinghouseState, pxDecimals]);

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
        'volume_force_overlay',
        'widget_logo',
        'header_compare',
        'right_toolbar',
        'trading_account_manager',
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
      <div className="flex-1 min-h-0 p-8">
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
          className="w-full h-full rounded-[8px]"
        />
      </div>
    </div>
  );
};
