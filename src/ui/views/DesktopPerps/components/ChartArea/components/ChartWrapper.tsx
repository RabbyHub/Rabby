import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { splitNumberByStep } from '@/ui/utils';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';
import {
  normalizeTradingViewLocale,
  TradingViewHoverData,
  TradingViewIframeChart,
} from '@/ui/views/Perps/components/TradingViewIframeChart';
import { isScreenSmall } from '../../../utils';

interface ChartWrapperProps {
  coin: string;
  interval: string;
}

type IntervalKey =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '8h'
  | '1d'
  | '1w';

const INTERVAL_OPTIONS: Array<{ label: string; value: IntervalKey }> = [
  { label: '1M', value: '1m' },
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '30M', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '8H', value: '8h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
];

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  coin,
  interval: propInterval,
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

  const [selectedInterval, setSelectedInterval] = useState<IntervalKey>(
    (propInterval as IntervalKey) || '15m'
  );
  const [chartHoverData, setChartHoverData] = useState<TradingViewHoverData>({
    visible: false,
  });
  const [latestCandle, setLatestCandle] = useState<TradingViewHoverData | null>(
    null
  );

  useEffect(() => {
    if (propInterval && propInterval !== selectedInterval) {
      setSelectedInterval(propInterval as IntervalKey);
    }
  }, [propInterval, selectedInterval]);

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

  const showDisplayData = useMemo(() => {
    return chartHoverData.visible ? chartHoverData : latestCandle;
  }, [chartHoverData, latestCandle]);

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
        'header_settings',
        'header_compare',
        'header_undo_redo',
        'header_screenshot',
        'header_saveload',
        'volume_force_overlay',
      ],
      enabled_features: ['iframe_loading_compatibility_mode'],
      favorites: {
        intervals: ['15', '60', '240', '1D', '1W'],
      },
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-rb-neutral-bg-1">
      <div
        className={clsx(
          'flex px-16 py-12 gap-8',
          isScreenSmall() ? 'flex-col gap-4' : 'flex-row gap-8 items-center'
        )}
      >
        <div className="flex gap-8 flex-shrink-0">
          {INTERVAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedInterval(option.value)}
              className={clsx(
                'px-10 py-4 text-12 rounded-[4px] font-medium transition-colors',
                selectedInterval === option.value
                  ? 'bg-r-blue-default text-white'
                  : 'text-r-neutral-body hover:bg-r-neutral-bg3'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-8 flex-shrink-0">
          {showDisplayData ? (
            <>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot mr-2">O</span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(
                    Number(showDisplayData.open || 0).toFixed(pxDecimals)
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot mr-2">H</span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(
                    Number(showDisplayData.high || 0).toFixed(pxDecimals)
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot mr-2">L</span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(
                    Number(showDisplayData.low || 0).toFixed(pxDecimals)
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot mr-2">C</span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(
                    Number(showDisplayData.close || 0).toFixed(pxDecimals)
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot mr-2">V</span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(
                    Number(showDisplayData.volume || 0).toFixed(2)
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {showDisplayData.isPositiveChange ? '+' : '-'}$
                  {splitNumberByStep(
                    Math.abs(Number(showDisplayData.delta || 0)).toFixed(
                      pxDecimals
                    )
                  )}{' '}
                  ({showDisplayData.isPositiveChange ? '+' : ''}
                  {formatPercent(showDisplayData.deltaPercent || 0)})
                </span>
              </div>
            </>
          ) : (
            <div className="text-13 text-r-neutral-foot">Loading chart...</div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-8">
        <TradingViewIframeChart
          coin={coin}
          interval={selectedInterval}
          pxDecimals={pxDecimals}
          isDarkTheme={isDarkTheme}
          locale={chartLocale}
          timezone={chartTimezone}
          lineTagInfo={lineTagInfo}
          widgetConfig={desktopWidgetConfig}
          onHoverData={setChartHoverData}
          onLatestBar={setLatestCandle}
          className="w-full h-full rounded-[8px]"
        />
      </div>
    </div>
  );
};
