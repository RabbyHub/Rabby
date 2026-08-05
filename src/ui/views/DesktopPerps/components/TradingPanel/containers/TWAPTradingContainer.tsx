import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderSideInfo, TradingContainerProps } from '../../../types';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useMemoizedFn, useRequest } from 'ahooks';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButtons } from '../components/TradingButtons';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import stats from '@/stats';
import { formatPerpsCoin, getStatsReportSide } from '../../../utils';
import { BigNumber } from 'bignumber.js';
import { calcAmountFromPercentage } from '../utils';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import {
  useOrderConfirm,
  OrderConfirmContent,
} from '../../../modal/OrderConfirmProvider';
import type { OrderConfirmRow } from '../../../modal/OrderConfirmModal';
import {
  ConfirmAmount,
  LiveMarkPrice,
} from '../../../modal/OrderConfirmLiveValues';

const RUNTIME_PRESETS = [
  { label: '1h', hours: 1, minutes: 0 },
  { label: '6h', hours: 6, minutes: 0 },
  { label: '12h', hours: 12, minutes: 0 },
  { label: '24h', hours: 24, minutes: 0 },
];

/** `95` → `1h 35m`, `35` → `35m`. Used by the panel's max-duration hint. */
const formatDurationDisplay = (totalMins: number) => {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hours > 0
    ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim()
    : `${mins}m`;
};

/** `95` → `1 hr 35 mins`, `10` → `10 mins`. The confirmation dialog spells the
 * units out where the panel's inline hint stays compact. */
const formatDurationWithUnit = (totalMins: number) => {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours > 1 ? 'hrs' : 'hr'}`);
  }
  if (mins > 0 || hours === 0) {
    parts.push(`${mins} ${mins === 1 ? 'min' : 'mins'}`);
  }
  return parts.join(' ');
};

/**
 * The order exactly as it will be sent, snapshotted when the button is clicked.
 * `size` is re-derived from streaming maxes in slider mode, so the dialog and
 * the submit have to read it from the same snapshot or they drift apart while
 * the dialog is up.
 */
interface TwapOrder {
  isBuy: boolean;
  size: string;
  durationMins: number;
  randomizeDelay: boolean;
  reduceOnly: boolean;
}

export const TWAPTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get data from perpsState
  const {
    currentPerpsAccount,
    selectedCoin,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    szDecimals,
    pxDecimals,
    leverage,
    leverageType,
    availableBalance,
    quoteAsset,
    reduceOnly,
    setReduceOnly,
    tradeSize,
    maxBuyTradeSize,
    maxSellTradeSize,
    currentMarketData,
    percentage,
    setPercentage,
    sizeDisplayUnit,
    setSizeDisplayUnit,
    resetForm,
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
    calcDirectionInfo,
    buyTradeSize,
    sellTradeSize,
  } = usePerpsTradingState();
  const [hourInput, setHourInput] = React.useState('0');
  const [minuteInput, setMinuteInput] = React.useState('5');
  const [randomize, setRandomize] = React.useState(false);

  const allMinsDuration = React.useMemo(() => {
    return Number(hourInput) * 60 + Number(minuteInput);
  }, [hourInput, minuteInput]);

  const numberOfOrders = React.useMemo(
    () => Math.floor((allMinsDuration * 60) / 30) + 1,
    [allMinsDuration]
  );

  const calcSizePerSuborder = useMemoizedFn((totalSize: string) => {
    const perSuborder = Number(totalSize) / numberOfOrders;
    return Number.isNaN(perSuborder) ? '-' : perSuborder.toFixed(szDecimals);
  });

  const sizePerSuborder = React.useMemo(() => calcSizePerSuborder(tradeSize), [
    calcSizePerSuborder,
    tradeSize,
    numberOfOrders,
    szDecimals,
  ]);

  // Max duration calculation based on current input size (each suborder must be >= $10)
  const { maxDurationMins, maxDurationDisplay } = useMemo(() => {
    const currentSize = Number(positionSize.amount) || 0;
    const notional = currentSize * midPrice;
    const maxOrders = Math.floor(notional / 10);
    if (maxOrders <= 1) {
      return { maxDurationMins: 0, maxDurationDisplay: '' };
    }
    const maxMins = Math.min(Math.floor(((maxOrders - 1) * 30) / 60), 1440);
    return {
      maxDurationMins: maxMins,
      maxDurationDisplay: formatDurationDisplay(maxMins),
    };
  }, [positionSize.amount, midPrice]);

  useEffect(() => {
    setHourInput('0');
    setMinuteInput('5');
    setRandomize(false);
  }, [selectedCoin]);

  // Order info for dual-column grid
  const buyInfo: OrderSideInfo = useMemo(() => {
    const info = calcDirectionInfo('Long', buyTradeSize);
    return { ...info, max: maxBuyTradeSize || '0' };
  }, [calcDirectionInfo, buyTradeSize, maxBuyTradeSize]);

  const sellInfo: OrderSideInfo = useMemo(() => {
    const info = calcDirectionInfo('Short', sellTradeSize);
    return { ...info, max: maxSellTradeSize || '0' };
  }, [calcDirectionInfo, sellTradeSize, maxSellTradeSize]);

  // Shared validation (direction-agnostic)
  const validation = useMemo(() => {
    const size = Number(positionSize.amount) || 0;
    const notionalNum = size * midPrice;

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    if (allMinsDuration < 5) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.runtimeTooShort'),
      };
    }

    if (allMinsDuration > 1440) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.runtimeTooLong'),
      };
    }

    if (notionalNum < 10) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.minimumOrderSize'),
      };
    }

    if (Number(sizePerSuborder) * midPrice < 10) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.minimumSuborderSize'),
      };
    }

    // Max trade size - use max of both directions (shared check)
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          (currentPosition?.side === 'Long'
            ? maxSellTradeSize
            : maxBuyTradeSize) || 0
        )
      : Math.max(Number(maxBuyTradeSize || 0), Number(maxSellTradeSize || 0));

    if (effectiveMaxTradeSize > 0 && size > effectiveMaxTradeSize) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.insufficientBalance'),
      };
    }

    const maxUsdValue = Number(currentMarketData?.maxUsdValueSize || 1000000);
    if (notionalNum > maxUsdValue) {
      return {
        isValid: false,
        error:
          t('page.perpsPro.tradingPanel.maximumOrderSize', {
            amount: `$${maxUsdValue}`,
          }) || `Maximum order size is $${maxUsdValue}`,
      };
    }

    return { isValid: true, error: '' };
  }, [
    positionSize.amount,
    midPrice,
    allMinsDuration,
    sizePerSuborder,
    maxBuyTradeSize,
    maxSellTradeSize,
    reduceOnly,
    currentPosition,
    currentMarketData,
    t,
  ]);

  const {
    handleOpenTWAPOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? maxBuyTradeSize : maxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return tradeSize;
  };

  const buildOrder = useMemoizedFn(
    (isBuy: boolean): TwapOrder => ({
      isBuy,
      size: getDirectionTradeSize(isBuy),
      durationMins: allMinsDuration,
      randomizeDelay: randomize,
      reduceOnly,
    })
  );

  const submitOrder = useMemoizedFn(async (order: TwapOrder) => {
    await handleOpenTWAPOrder({
      coin: selectedCoin,
      isBuy: order.isBuy,
      size: order.size,
      reduceOnly: order.reduceOnly,
      durationMins: order.durationMins,
      randomizeDelay: order.randomizeDelay,
    });
    stats.report('perpsTradeHistory', {
      created_at: new Date().getTime(),
      user_addr: currentPerpsAccount?.address || '',
      trade_type: 'twap',
      leverage: leverage.toString(),
      trade_side: getStatsReportSide(order.isBuy, order.reduceOnly),
      margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
      coin: selectedCoin,
      size: order.size,
      price: markPrice,
      trade_usd_value: new BigNumber(markPrice).times(order.size).toFixed(2),
      service_provider: 'hyperliquid',
      app_version: process.env.release || '0',
      address_type: currentPerpsAccount?.type || '',
    });
  });

  // One request per side so each button keeps its own loading state.
  const { runAsync: submitBuyOrder, loading: buyLoading } = useRequest(
    submitOrder,
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {},
    }
  );

  const { runAsync: submitSellOrder, loading: sellLoading } = useRequest(
    submitOrder,
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {},
    }
  );

  const requestConfirm = useOrderConfirm();

  /**
   * Built from the snapshot the submit will send, so the dialog can never show
   * a size or duration the order does not carry.
   */
  const buildConfirmContent = useMemoizedFn(
    (order: TwapOrder): OrderConfirmContent => {
      const { isBuy, size: directionSize } = order;
      const coinLabel = formatPerpsCoin(selectedCoin);
      const notional = new BigNumber(directionSize || 0).times(midPrice);
      const perSuborder = calcSizePerSuborder(directionSize);
      const rows: OrderConfirmRow[] = [];

      if (notional.gt(0)) {
        rows.push({
          key: 'totalAmount',
          label: t('page.perpsPro.orderConfirm.totalAmountApproximately'),
          value: `${splitNumberByStep(notional.toFixed(2))} ${quoteAsset}`,
        });
      }

      if (Number(directionSize) > 0) {
        rows.push({
          key: 'totalSize',
          label: t('page.perpsPro.orderConfirm.totalSize'),
          value: (
            <ConfirmAmount
              amount={directionSize}
              coin={selectedCoin}
              price={midPrice}
              quoteAsset={quoteAsset}
            />
          ),
          emphasize: true,
        });
      }

      rows.push({
        key: 'totalTime',
        label: t('page.perpsPro.orderConfirm.totalTime'),
        value: formatDurationWithUnit(order.durationMins),
      });

      if (perSuborder !== '-' && Number(perSuborder) > 0) {
        rows.push({
          key: 'amount',
          label: t('page.perpsPro.orderConfirm.amount'),
          value: (
            <ConfirmAmount
              amount={perSuborder}
              coin={selectedCoin}
              price={midPrice}
              quoteAsset={quoteAsset}
            />
          ),
        });
      }

      if (markPrice > 0) {
        rows.push({
          key: 'lastPrice',
          label: t('page.perpsPro.orderConfirm.lastPrice'),
          // Not part of the payload — a live reference the user reads while the
          // dialog is open, so it keeps ticking instead of freezing.
          value: (
            <LiveMarkPrice
              coin={selectedCoin}
              fallback={markPrice}
              pxDecimals={pxDecimals}
              quoteAsset={quoteAsset}
            />
          ),
        });
      }

      rows.push({
        key: 'reduceOnly',
        label: t('page.perpsPro.orderConfirm.reduceOnly'),
        value: order.reduceOnly
          ? t('page.perpsPro.orderConfirm.yes')
          : t('page.perpsPro.orderConfirm.no'),
      });

      return {
        title: `${coinLabel}-${quoteAsset}`,
        titleSuffix: {
          text: isBuy
            ? t('page.perpsPro.orderConfirm.buyLong')
            : t('page.perpsPro.orderConfirm.sellShort'),
          tone: isBuy ? 'up' : 'down',
        },
        sections: [{ key: 'twap', rows }],
      };
    }
  );

  const handleOrderClick = useMemoizedFn((isBuy: boolean) => {
    const order = buildOrder(isBuy);
    // The submit request reports its own failures, so drop the rejection here.
    Promise.resolve(
      requestConfirm({
        type: 'twap',
        content: () => buildConfirmContent(order),
        dontShowAgainText: t('page.perpsPro.orderConfirm.dontShowAgain', {
          orderType: t('page.perpsPro.orderConfirm.orderTypeName.twap'),
        }),
        submit: () => (isBuy ? submitBuyOrder(order) : submitSellOrder(order)),
      })
    ).catch(() => {});
  });

  const validateNumberInput = (value: string) => {
    return /^[0-9]*$/.test(value);
  };

  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateNumberInput(value)) {
      setHourInput(value);
    }
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateNumberInput(value)) {
      setMinuteInput(value);
    }
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <OrderSideAndFunds
        availableBalance={availableBalance}
        quoteAsset={quoteAsset}
      />

      <div className="mt-[6px]">
        <PositionSizeInputAndSlider
          price={midPrice}
          maxBuyTradeSize={maxBuyTradeSize}
          maxSellTradeSize={maxSellTradeSize}
          positionSize={positionSize}
          setPositionSize={setPositionSize}
          percentage={percentage}
          setPercentage={setPercentage}
          baseAsset={selectedCoin}
          quoteAsset={quoteAsset}
          szDecimals={szDecimals}
          sizeDisplayUnit={sizeDisplayUnit}
          onUnitChange={setSizeDisplayUnit}
          reduceOnly={reduceOnly}
        />
      </div>

      <div className="h-[1px] bg-rb-neutral-line my-[12px]" />

      {/* Total Time Section */}
      <div className="flex flex-col gap-[8px]">
        <span className="text-rb-neutral-secondary text-12">
          {t('page.perpsPro.tradingPanel.totalTime')}
        </span>

        {/* Hour / Min inputs */}
        <div className="flex items-center gap-[8px]">
          <DesktopPerpsInput
            value={hourInput}
            onChange={handleHourInputChange}
            className="flex-1 text-left"
            suffix={
              <span className="text-15 text-rb-neutral-title-1">
                {t('page.perpsPro.tradingPanel.hour')}
              </span>
            }
          />
          <DesktopPerpsInput
            value={minuteInput}
            onChange={handleMinuteInputChange}
            className="flex-1 text-left"
            suffix={
              <span className="text-15 text-rb-neutral-title-1">
                {t('page.perpsPro.tradingPanel.min')}
              </span>
            }
          />
        </div>

        {/* Preset buttons */}
        <div className="flex items-center gap-[8px]">
          {RUNTIME_PRESETS.map((preset) => {
            const presetMins = preset.hours * 60 + preset.minutes;
            const isActive =
              Number(hourInput) === preset.hours &&
              Number(minuteInput) === preset.minutes;
            const isDisabled = presetMins > maxDurationMins;
            return (
              <div
                key={preset.label}
                className={clsx(
                  'flex-1 h-[32px] flex items-center justify-center text-center text-[13px] rounded-[6px] border border-solid',
                  isActive
                    ? 'bg-rb-brand-light-1 text-rb-neutral-title-1 border-rb-brand-default cursor-pointer'
                    : isDisabled
                    ? 'bg-rb-neutral-bg-2 text-rb-neutral-foot border-transparent opacity-50 cursor-not-allowed'
                    : 'bg-rb-neutral-bg-2 text-r-neutral-title-1 border-transparent hover:border-rb-brand-default cursor-pointer'
                )}
                onClick={() => {
                  if (!isDisabled) {
                    setHourInput(String(preset.hours));
                    setMinuteInput(String(preset.minutes));
                  }
                }}
              >
                {preset.label}
              </div>
            );
          })}
        </div>

        {/* Max duration + Number of Orders info */}
        {maxDurationMins >= 5 && (
          <div className="text-rb-neutral-secondary text-12">
            {t('page.perpsPro.tradingPanel.maxDurationTwap')}{' '}
            <span className="text-rb-neutral-body">{maxDurationDisplay}</span>.
          </div>
        )}
        <div className="text-rb-neutral-secondary text-12">
          {t('page.perpsPro.tradingPanel.numberOfOrders')}{' '}
          <span className="text-rb-neutral-body">{numberOfOrders}</span>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <PerpsCheckbox
          checked={reduceOnly}
          onChange={setReduceOnly}
          tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
          title={t('page.perpsPro.tradingPanel.reduceOnly')}
          disabled={!currentPosition}
        />
        <PerpsCheckbox
          checked={randomize}
          onChange={(checked) => setRandomize(checked)}
          tooltipText={t('page.perpsPro.tradingPanel.randomizeTooltip')}
          title={t('page.perpsPro.tradingPanel.randomize')}
        />
      </div>

      <TradingButtons
        onBuyClick={() => handleOrderClick(true)}
        onSellClick={() => handleOrderClick(false)}
        buyLoading={buyLoading}
        sellLoading={sellLoading}
        buyDisabled={!validation.isValid || reduceOnlyBuyDisabled}
        sellDisabled={!validation.isValid || reduceOnlySellDisabled}
        buyError={validation.error || undefined}
        sellError={validation.error || undefined}
      />

      <OrderInfoGrid
        buy={buyInfo}
        sell={sellInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
        hideLiqPrice
        price={midPrice}
        quoteAsset={quoteAsset}
      />
    </div>
  );
};
