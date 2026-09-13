import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderSideInfo } from '../../../types';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useMemoizedFn, useRequest } from 'ahooks';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButtons } from '../components/TradingButtons';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import { BigNumber } from 'bignumber.js';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { calcAmountFromPercentage } from '../utils';
import { useDirectionMaxGate } from '../hooks/useDirectionMaxGate';
import perpsToast from '../../PerpsToast';
import { splitNumberByStep } from '@/ui/utils';
import { useOrderConfirm } from '../../../modal/OrderConfirmProvider';
import { LiveLiquidation } from '../../../modal/OrderConfirmLiveValues';
import { buildTakeOrStopConfirmContent } from './takeOrStopConfirmContent';

interface TakeOrStopLimitTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
}

/**
 * The order exactly as it will be sent, snapshotted when the button is clicked.
 * `size` is re-derived from streaming maxes in slider mode, so the dialog and
 * the submit have to read it from the same snapshot or they drift apart while
 * the dialog is up.
 */
interface ConditionalLimitOrder {
  isBuy: boolean;
  size: string;
  triggerPx: string;
  limitPx: string;
  reduceOnly: boolean;
}

export const TakeOrStopLimitTradingContainer: React.FC<TakeOrStopLimitTradingContainerProps> = ({
  takeOrStop,
}) => {
  const { t } = useTranslation();

  // Get data from perpsState
  const {
    currentPerpsAccount,
    leverageType,
    selectedCoin,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    szDecimals,
    pxDecimals,
    leverage,
    availableBalance,
    reduceOnly,
    setReduceOnly,
    tradeSize,
    maxBuyTradeSize,
    quoteAsset,
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
  } = usePerpsTradingState();
  const [triggerPrice, setTriggerPrice] = React.useState('');
  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );

  const hasFillLimitPrice = React.useRef(false);
  useEffect(() => {
    if (!hasFillLimitPrice.current && midPrice) {
      const price = formatTpOrSlPrice(midPrice, szDecimals);
      setLimitPrice(price);
      hasFillLimitPrice.current = true;
      eventBus.emit(EVENTS.PERPS.SWITCH_LIMIT_FILL_PRICE, price);
    }
  }, [midPrice, szDecimals]);

  // Estimated fill price: the typed limit price, falling back to mid while the
  // field is empty. Same for both directions.
  const estPrice = Number(limitPrice) || midPrice;

  const limitMaxBuyTradeSize = React.useMemo(() => {
    if (reduceOnly) {
      return currentPosition?.side === 'Short'
        ? currentPosition.size.toFixed(szDecimals)
        : '0';
    }
    if (!estPrice) return maxBuyTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .div(estPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Short' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estPrice,
    availableBalance,
    leverage,
    szDecimals,
    currentPosition,
    maxBuyTradeSize,
    reduceOnly,
  ]);

  const limitMaxSellTradeSize = React.useMemo(() => {
    if (reduceOnly) {
      return currentPosition?.side === 'Long'
        ? currentPosition.size.toFixed(szDecimals)
        : '0';
    }
    if (!estPrice) return maxSellTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .div(estPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Long' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estPrice,
    availableBalance,
    leverage,
    szDecimals,
    currentPosition,
    maxSellTradeSize,
    reduceOnly,
  ]);

  // Limit-specific trade sizes: slider mode uses limitMax instead of hook's market-based max
  const limitBuyTradeSize = React.useMemo(() => {
    if (positionSize.inputSource === 'slider' && percentage > 0) {
      return calcAmountFromPercentage(
        percentage,
        limitMaxBuyTradeSize,
        szDecimals
      );
    }
    return tradeSize;
  }, [
    positionSize.inputSource,
    percentage,
    limitMaxBuyTradeSize,
    szDecimals,
    tradeSize,
  ]);

  const limitSellTradeSize = React.useMemo(() => {
    if (positionSize.inputSource === 'slider' && percentage > 0) {
      return calcAmountFromPercentage(
        percentage,
        limitMaxSellTradeSize,
        szDecimals
      );
    }
    return tradeSize;
  }, [
    positionSize.inputSource,
    percentage,
    limitMaxSellTradeSize,
    szDecimals,
    tradeSize,
  ]);

  // Use hook's calcDirectionInfo with limit-based trade sizes and estPrice
  const buyDirInfo = React.useMemo(
    () => calcDirectionInfo('Long', limitBuyTradeSize, estPrice),
    [calcDirectionInfo, limitBuyTradeSize, estPrice]
  );
  const sellDirInfo = React.useMemo(
    () => calcDirectionInfo('Short', limitSellTradeSize, estPrice),
    [calcDirectionInfo, limitSellTradeSize, estPrice]
  );

  useEffect(() => {
    setTriggerPrice('');
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  }, [selectedCoin]);

  const isStopLoss = takeOrStop === 'sl';

  // Form validation (direction-agnostic, trigger price direction check moved to
  // button click; the per-side max gate lives at the buttons)
  const validation = useMemo(() => {
    const tradeSize = Number(positionSize.amount) || 0;
    const notionalNum = tradeSize * estPrice;

    // Empty trigger/limit price check
    if (!triggerPrice || Number(triggerPrice) <= 0) {
      return { isValid: false, error: '' };
    }
    if (!limitPrice || Number(limitPrice) <= 0) {
      return { isValid: false, error: '' };
    }

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    // Min order size check ($10)
    if (notionalNum > 0 && notionalNum < 10) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.minimumOrderSize'),
      };
    }

    // Max USD value check
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
    limitPrice,
    triggerPrice,
    estPrice,
    currentMarketData,
    t,
  ]);

  const checkDirectionMax = useDirectionMaxGate({
    positionSize,
    maxBuyTradeSize: limitMaxBuyTradeSize,
    maxSellTradeSize: limitMaxSellTradeSize,
  });

  const {
    handleOpenTPSlLimitOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? limitMaxBuyTradeSize : limitMaxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return String(Number(positionSize.amount) || 0);
  };

  const buildOrder = useMemoizedFn(
    (isBuy: boolean): ConditionalLimitOrder => ({
      isBuy,
      size: getDirectionTradeSize(isBuy),
      triggerPx: triggerPrice,
      limitPx: limitPrice,
      reduceOnly,
    })
  );

  /**
   * Runs at click time so the confirmation dialog never opens on an order that
   * would be rejected the moment it is confirmed.
   */
  const checkTriggerDirection = useMemoizedFn(
    (isBuy: boolean, triggerPx: string) => {
      const trigger = Number(triggerPx);
      let messageKey = '';
      if (isStopLoss) {
        if (isBuy && trigger <= midPrice) {
          messageKey =
            'page.perpsPro.tradingPanel.slBuyMustBeHigherThanMidPrice';
        } else if (!isBuy && trigger >= midPrice) {
          messageKey =
            'page.perpsPro.tradingPanel.slSellMustBeLowerThanMidPrice';
        }
      } else if (isBuy && trigger >= midPrice) {
        messageKey = 'page.perpsPro.tradingPanel.tpBuyMustBeLowerThanMidPrice';
      } else if (!isBuy && trigger <= midPrice) {
        messageKey =
          'page.perpsPro.tradingPanel.tpSellMustBeHigherThanMidPrice';
      }
      if (!messageKey) return true;
      perpsToast.error({
        title: t('page.perps.toast.orderError'),
        description: t(messageKey),
      });
      return false;
    }
  );

  const submitOrder = useMemoizedFn(async (order: ConditionalLimitOrder) => {
    // Backstop: the click-time check ran before the dialog opened, but it
    // compares the trigger against a streaming mid price. If mid crosses the
    // trigger while the dialog is up, this would submit a stop that fires
    // immediately.
    if (!checkTriggerDirection(order.isBuy, order.triggerPx)) {
      throw new Error('Invalid trigger direction');
    }
    await handleOpenTPSlLimitOrder({
      coin: selectedCoin,
      isBuy: order.isBuy,
      size: order.size,
      triggerPx: order.triggerPx,
      limitPx: order.limitPx,
      reduceOnly: order.reduceOnly,
      tpsl: takeOrStop,
    });
    stats.report('perpsTradeHistory', {
      created_at: new Date().getTime(),
      user_addr: currentPerpsAccount?.address || '',
      trade_type: takeOrStop === 'tp' ? 'take profit limit' : 'stop loss limit',
      leverage: leverage.toString(),
      trade_side: getStatsReportSide(order.isBuy, order.reduceOnly),
      margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
      coin: selectedCoin,
      size: order.size,
      price: order.limitPx,
      trade_usd_value: new BigNumber(order.limitPx)
        .times(order.size)
        .toFixed(2),
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
      onError: (error) => {
        console.error('open conditional limit order error', error);
      },
    }
  );

  const { runAsync: submitSellOrder, loading: sellLoading } = useRequest(
    submitOrder,
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {
        console.error('open conditional limit order error', error);
      },
    }
  );

  // Build OrderSideInfo using hook's calcDirectionInfo
  const limitBuyInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: buyDirInfo.liqPrice,
      liqPriceNum: buyDirInfo.liqPriceNum,
      cost: buyDirInfo.cost,
      max: limitMaxBuyTradeSize || '0',
    }),
    [buyDirInfo, limitMaxBuyTradeSize]
  );

  const limitSellInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: sellDirInfo.liqPrice,
      liqPriceNum: sellDirInfo.liqPriceNum,
      cost: sellDirInfo.cost,
      max: limitMaxSellTradeSize || '0',
    }),
    [sellDirInfo, limitMaxSellTradeSize]
  );

  const requestConfirm = useOrderConfirm();

  const handlePlaceOrder = useMemoizedFn((isBuy: boolean) => {
    if (!checkDirectionMax(isBuy)) return;
    const order = buildOrder(isBuy);
    if (!checkTriggerDirection(isBuy, order.triggerPx)) return;
    // The entry is the limit price the user typed, so the liquidation price is
    // fixed and only its distance from the streaming mark moves.
    const liqCell = (variant: 'price' | 'distance') => (
      <LiveLiquidation
        direction={isBuy ? 'Long' : 'Short'}
        size={order.size}
        orderPrice={order.limitPx}
        pxDecimals={pxDecimals}
        variant={variant}
      />
    );
    const request = requestConfirm({
      type: 'conditional',
      content: () =>
        buildTakeOrStopConfirmContent({
          t,
          isBuy,
          selectedCoin,
          quoteAsset,
          triggerPrice: order.triggerPx,
          priceText: order.limitPx
            ? `${splitNumberByStep(order.limitPx)} ${quoteAsset}`
            : '',
          markPrice,
          pxDecimals,
          amount: order.size,
          // Matches the size input's own price, so a USD-entered size is shown
          // back as the figure the user typed.
          amountPrice: Number(order.limitPx) || midPrice,
          // Always shown; the cell renders `-` when there is no liquidation
          // price or no mark price to measure the distance against.
          liqPriceCell: liqCell('price'),
          liqDistanceCell: liqCell('distance'),
          reduceOnly: order.reduceOnly,
        }),
      dontShowAgainText: t('page.perpsPro.orderConfirm.dontShowAgain', {
        orderType: t('page.perpsPro.orderConfirm.orderTypeName.conditional'),
      }),
      submit: () => (isBuy ? submitBuyOrder(order) : submitSellOrder(order)),
    });
    // The submit request reports its own failures, so drop the rejection here.
    Promise.resolve(request).catch(() => {});
  });

  useEffect(() => {
    const handleClickPrice = (price: string) => {
      setLimitPrice(price.toString());
    };
    eventBus.addEventListener(
      EVENTS.PERPS.HANDLE_CLICK_PRICE,
      handleClickPrice
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.PERPS.HANDLE_CLICK_PRICE,
        handleClickPrice
      );
    };
  }, []);

  const handleTriggerPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setTriggerPrice(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setLimitPrice(value);
    }
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <OrderSideAndFunds
        availableBalance={availableBalance}
        quoteAsset={quoteAsset}
      />

      <div className="flex flex-col gap-[6px] mt-[6px] mb-[6px]">
        <span className="text-rb-neutral-secondary text-12">
          {t('page.perpsPro.tradingPanel.triggerPrice')}
        </span>
        <div className="flex items-center gap-8">
          <DesktopPerpsInput
            value={triggerPrice}
            onChange={handleTriggerPriceChange}
            className="text-left"
            suffix={
              <span className="text-15 text-rb-neutral-title-1">
                {quoteAsset}
              </span>
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-[6px] mb-[6px]">
        <span className="text-rb-neutral-secondary text-12">
          {t('page.perpsPro.tradingPanel.limitPrice')}
        </span>
        <div className="flex items-center gap-8">
          <DesktopPerpsInput
            value={limitPrice}
            onChange={handleLimitPriceChange}
            className="text-left"
            suffix={
              <span className="text-15 text-rb-neutral-title-1">
                {quoteAsset}
              </span>
            }
          />
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={estPrice}
        maxBuyTradeSize={limitMaxBuyTradeSize}
        maxSellTradeSize={limitMaxSellTradeSize}
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

      <div className="h-[1px] bg-rb-neutral-line my-[12px]" />

      <div className="flex items-center justify-between">
        <PerpsCheckbox
          checked={reduceOnly}
          onChange={setReduceOnly}
          tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
          title={t('page.perpsPro.tradingPanel.reduceOnly')}
          disabled={!currentPosition}
        />
      </div>

      {/* Place Order Buttons */}
      <TradingButtons
        onBuyClick={() => handlePlaceOrder(true)}
        onSellClick={() => handlePlaceOrder(false)}
        buyLoading={buyLoading}
        sellLoading={sellLoading}
        buyDisabled={!validation.isValid || reduceOnlyBuyDisabled}
        sellDisabled={!validation.isValid || reduceOnlySellDisabled}
        buyError={validation.error || undefined}
        sellError={validation.error || undefined}
      />

      {/* Order Info */}
      <OrderInfoGrid
        buy={limitBuyInfo}
        sell={limitSellInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        quoteAsset={quoteAsset}
        reduceOnly={reduceOnly}
        price={estPrice}
      />
    </div>
  );
};
