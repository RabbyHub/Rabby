import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { BigNumber } from 'bignumber.js';
import { calcAmountFromPercentage } from '../utils';
import perpsToast from '../../PerpsToast';
import { useOrderConfirm } from '../../../modal/OrderConfirmProvider';
import { LiveLiquidation } from '../../../modal/OrderConfirmLiveValues';
import { buildTakeOrStopConfirmContent } from './takeOrStopConfirmContent';

interface TakeOrStopMarketTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
}

/**
 * The order exactly as it will be sent, snapshotted when the button is clicked.
 * `size` is re-derived from streaming maxes in slider mode, so the dialog and
 * the submit have to read it from the same snapshot or they drift apart while
 * the dialog is up.
 */
interface ConditionalMarketOrder {
  isBuy: boolean;
  size: string;
  triggerPx: string;
  reduceOnly: boolean;
}

export const TakeOrStopMarketTradingContainer: React.FC<TakeOrStopMarketTradingContainerProps> = ({
  takeOrStop,
}) => {
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
    tradeUsdAmount,
    marginRequired,
    tradeSize,
    buyInfo,
    sellInfo,
    maxBuyTradeSize,
    maxSellTradeSize,
    marginUsage,
    currentMarketData,
    percentage,
    setPercentage,
    sizeDisplayUnit,
    setSizeDisplayUnit,
    resetForm,
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
  } = usePerpsTradingState();
  const [triggerPrice, setTriggerPrice] = React.useState('');

  useEffect(() => {
    setTriggerPrice('');
  }, [selectedCoin]);

  const isStopLoss = takeOrStop === 'sl';

  // Form validation (direction-agnostic)
  const validation = useMemo(() => {
    const tradeSize = Number(positionSize.amount) || 0;
    const notionalNum = tradeSize * Number(markPrice || 0);

    if (!triggerPrice || Number(triggerPrice) <= 0) {
      return { isValid: false, error: '' };
    }

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    // Check minimum order size ($10)
    if (notionalNum > 0 && notionalNum < 10) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.minimumOrderSize'),
      };
    }

    // Check max trade size with reduceOnly awareness
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          (currentPosition?.side === 'Long'
            ? maxSellTradeSize
            : maxBuyTradeSize) || 0
        )
      : Math.max(Number(maxBuyTradeSize || 0), Number(maxSellTradeSize || 0));

    if (effectiveMaxTradeSize > 0 && tradeSize > effectiveMaxTradeSize) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.insufficientBalance'),
      };
    }

    // Check maximum position size
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
    markPrice,
    maxBuyTradeSize,
    maxSellTradeSize,
    reduceOnly,
    currentPosition,
    currentMarketData,
    triggerPrice,
    t,
  ]);

  const {
    handleOpenTPSlMarketOrder,
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
    (isBuy: boolean): ConditionalMarketOrder => ({
      isBuy,
      size: getDirectionTradeSize(isBuy),
      triggerPx: triggerPrice,
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

  const submitOrder = useMemoizedFn(async (order: ConditionalMarketOrder) => {
    // Backstop: the click-time check ran before the dialog opened, but it
    // compares the trigger against a streaming mid price. If mid crosses the
    // trigger while the dialog is up, this would submit a stop that fires
    // immediately as a market order.
    if (!checkTriggerDirection(order.isBuy, order.triggerPx)) {
      throw new Error('Invalid trigger direction');
    }
    await handleOpenTPSlMarketOrder({
      coin: selectedCoin,
      isBuy: order.isBuy,
      size: order.size,
      triggerPx: order.triggerPx,
      reduceOnly: order.reduceOnly,
      tpsl: takeOrStop,
    });
    stats.report('perpsTradeHistory', {
      created_at: new Date().getTime(),
      user_addr: currentPerpsAccount?.address || '',
      trade_type:
        takeOrStop === 'tp' ? 'take profit market' : 'stop loss market',
      leverage: leverage.toString(),
      trade_side: getStatsReportSide(order.isBuy, order.reduceOnly),
      margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
      coin: selectedCoin,
      size: order.size,
      price: order.triggerPx,
      trade_usd_value: new BigNumber(order.triggerPx)
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
        console.error('open conditional market order error', error);
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
        console.error('open conditional market order error', error);
      },
    }
  );

  const requestConfirm = useOrderConfirm();

  const handlePlaceOrder = useMemoizedFn((isBuy: boolean) => {
    const order = buildOrder(isBuy);
    if (!checkTriggerDirection(isBuy, order.triggerPx)) return;
    // Whether the liquidation rows exist is settled at click time — the panel
    // has none for an order that only closes exposure — but their values are
    // not: this order fills at market, so its entry is the mark price and both
    // the liquidation price and its distance move with it.
    const liqPriceNum = isBuy ? buyInfo.liqPriceNum : sellInfo.liqPriceNum;
    const request = requestConfirm({
      type: 'conditional',
      content: () =>
        buildTakeOrStopConfirmContent({
          t,
          isBuy,
          selectedCoin,
          quoteAsset,
          triggerPrice: order.triggerPx,
          priceText: t('page.perpsPro.orderConfirm.marketPrice'),
          markPrice,
          pxDecimals,
          amount: order.size,
          // Matches the size input's own price, so a USD-entered size is shown
          // back as the figure the user typed.
          amountPrice: markPrice,
          // Always shown; the cell renders `-` when there is no liquidation
          // price. A conditional market order fills at the mark, so both the
          // price and its distance follow it — hence no `orderPrice`.
          liqPriceCell: (
            <LiveLiquidation
              direction={isBuy ? 'Long' : 'Short'}
              size={order.size}
              pxDecimals={pxDecimals}
              variant="price"
            />
          ),
          liqDistanceCell: (
            <LiveLiquidation
              direction={isBuy ? 'Long' : 'Short'}
              size={order.size}
              pxDecimals={pxDecimals}
              variant="distance"
            />
          ),
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

  const handleMidClick = () => {
    setTriggerPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };

  useEffect(() => {
    const handleClickPrice = (price: string) => {
      setTriggerPrice(price.toString());
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

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={markPrice}
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
        buy={buyInfo}
        sell={sellInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
        price={midPrice}
        quoteAsset={quoteAsset}
      />
    </div>
  );
};
