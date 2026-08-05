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
import perpsToast from '../../PerpsToast';
import { useRabbySelector } from '@/ui/store';
import { PerpsDropdown } from '../components/PerpsDropdown';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import { useOrderConfirm } from '../../../modal/OrderConfirmProvider';
import { buildTakeOrStopConfirmContent } from './takeOrStopConfirmContent';

interface TakeOrStopLimitTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
}

/**
 * The order exactly as it will be sent, snapshotted when the button is clicked.
 * Both `size` (slider mode) and `limitPx` (BBO mode) are derived from streaming
 * values, so the dialog and the submit have to read them from the same snapshot
 * or they drift apart while the dialog is up.
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
  const bboPrices = useRabbySelector((state) => state.perps.bboPrices);
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

  // BBO state
  type BboStrategy = 'cp1' | 'cp5' | 'q1' | 'q5';
  const [bboEnabled, setBboEnabled] = React.useState(false);
  const [bboStrategy, setBboStrategy] = React.useState<BboStrategy>('cp1');

  const bboStrategyOptions = useMemo(
    () => [
      { key: 'cp1', label: 'Counterparty 1' },
      { key: 'cp5', label: 'Counterparty 5' },
      { key: 'q1', label: 'Queue 1' },
      { key: 'q5', label: 'Queue 5' },
    ],
    []
  );

  // BBO: direction-specific prices
  const { bboBuyPrice, bboSellPrice } = useMemo(() => {
    const isCounterparty = bboStrategy === 'cp1' || bboStrategy === 'cp5';
    const isFive = bboStrategy === 'cp5' || bboStrategy === 'q5';
    const askKey = (isFive ? 'asks5' : 'asks1') as keyof typeof bboPrices;
    const bidKey = (isFive ? 'bids5' : 'bids1') as keyof typeof bboPrices;
    return {
      bboBuyPrice: isCounterparty ? bboPrices[askKey] : bboPrices[bidKey],
      bboSellPrice: isCounterparty ? bboPrices[bidKey] : bboPrices[askKey],
    };
  }, [bboStrategy, bboPrices]);

  const canEnableBbo = true; // No TP/SL or ALO conflicts in this container

  const handleBboToggle = () => {
    if (bboEnabled) {
      setBboEnabled(false);
      setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
    } else if (canEnableBbo) {
      setBboEnabled(true);
    }
  };

  // Direction-specific limit prices (BBO mode uses orderbook sides)
  const buyLimitPrice = bboEnabled ? bboBuyPrice : limitPrice;
  const sellLimitPrice = bboEnabled ? bboSellPrice : limitPrice;

  // Estimated price: BBO mode → midPrice, manual → use limitPrice as-is
  const estBuyPrice = bboEnabled ? midPrice : Number(limitPrice) || midPrice;
  const estSellPrice = bboEnabled ? midPrice : Number(limitPrice) || midPrice;

  const limitMaxBuyTradeSize = React.useMemo(() => {
    if (reduceOnly) {
      return currentPosition?.side === 'Short'
        ? currentPosition.size.toFixed(szDecimals)
        : '0';
    }
    if (!estBuyPrice) return maxBuyTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .div(estBuyPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Short' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estBuyPrice,
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
    if (!estSellPrice) return maxSellTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .div(estSellPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Long' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estSellPrice,
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
    () => calcDirectionInfo('Long', limitBuyTradeSize, estBuyPrice),
    [calcDirectionInfo, limitBuyTradeSize, estBuyPrice]
  );
  const sellDirInfo = React.useMemo(
    () => calcDirectionInfo('Short', limitSellTradeSize, estSellPrice),
    [calcDirectionInfo, limitSellTradeSize, estSellPrice]
  );

  useEffect(() => {
    setTriggerPrice('');
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  }, [selectedCoin]);

  const isStopLoss = takeOrStop === 'sl';

  // Form validation (direction-agnostic, trigger price direction check moved to button click)
  const validation = useMemo(() => {
    const tradeSize = Number(positionSize.amount) || 0;
    // BBO mode: use max of both direction prices for shared validation
    const refPrice = bboEnabled
      ? Math.max(Number(buyLimitPrice || 0), Number(sellLimitPrice || 0))
      : Number(limitPrice || 0);
    const notionalNum = tradeSize * (refPrice || midPrice);

    // Empty trigger/limit price check
    if (!triggerPrice || Number(triggerPrice) <= 0) {
      return { isValid: false, error: '' };
    }
    if (!bboEnabled && (!limitPrice || Number(limitPrice) <= 0)) {
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

    // Max trade size check - use limitMax values with reduceOnly awareness
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          (currentPosition?.side === 'Long'
            ? limitMaxSellTradeSize
            : limitMaxBuyTradeSize) || 0
        )
      : Math.max(
          Number(limitMaxBuyTradeSize || 0),
          Number(limitMaxSellTradeSize || 0)
        );

    if (effectiveMaxTradeSize > 0 && tradeSize > effectiveMaxTradeSize) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.insufficientBalance'),
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
    midPrice,
    limitMaxBuyTradeSize,
    limitMaxSellTradeSize,
    reduceOnly,
    currentPosition,
    currentMarketData,
    bboEnabled,
    buyLimitPrice,
    sellLimitPrice,
    t,
  ]);

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
      limitPx: isBuy ? buyLimitPrice : sellLimitPrice,
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
    const order = buildOrder(isBuy);
    if (!checkTriggerDirection(isBuy, order.triggerPx)) return;
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
          estLiqPrice: isBuy
            ? limitBuyInfo.liqPriceNum
            : limitSellInfo.liqPriceNum,
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
          {bboEnabled ? (
            <PerpsDropdown
              options={bboStrategyOptions}
              onSelect={(key) => setBboStrategy(key as BboStrategy)}
            >
              <div className="flex-1 h-[44px] flex items-center justify-between px-[6px] rounded-[6px] border border-solid border-rb-neutral-line bg-rb-neutral-bg-5 cursor-pointer">
                <span className="text-[15px] text-rb-neutral-title-1">
                  {bboStrategyOptions.find((o) => o.key === bboStrategy)
                    ?.label || 'Counterparty 1'}
                </span>
                <RcIconArrowDownCC className="text-rb-neutral-secondary" />
              </div>
            </PerpsDropdown>
          ) : (
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
          )}
          <Tooltip
            overlayClassName="rectangle"
            placement="topRight"
            title={t('page.perpsPro.tradingPanel.bboTips')}
          >
            <div
              className={clsx(
                'min-w-[64px] h-[44px] relative flex items-center justify-center text-center text-15 rounded-[6px] border border-solid cursor-pointer',
                bboEnabled
                  ? 'bg-rb-brand-light-1 text-rb-neutral-title-1 border-rb-brand-default'
                  : 'bg-rb-neutral-bg-2 text-r-neutral-title-1 border-transparent'
              )}
              onClick={handleBboToggle}
            >
              BBO
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={bboEnabled ? midPrice : Number(limitPrice) || midPrice}
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
        price={bboEnabled ? midPrice : Number(limitPrice) || midPrice}
      />
    </div>
  );
};
