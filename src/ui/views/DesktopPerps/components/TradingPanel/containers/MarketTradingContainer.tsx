import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import {
  OrderSide,
  OrderSummaryData,
  TradingContainerProps,
} from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderSummary } from '../components/OrderSummary';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { Button } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSlider';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { EditMarketSlippage } from '../components/EditMarketSlippage';
import { TradingButton } from '../components/TradingButton';
import BigNumber from 'bignumber.js';
import { formatPercent, formatPerpsPct } from '@/ui/views/Perps/utils';

export const MarketTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get slippage from Redux
  const marketSlippage = useRabbySelector(
    (state) => state.perps.marketSlippage
  );

  const dispatch = useRabbyDispatch();

  // Get data from perpsState
  const {
    selectedCoin,
    orderSide,
    switchOrderSide,
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
    tradeUsdAmount,
    marginRequired,
    tradeSize,
    estimatedLiquidationPrice,
    maxTradeSize,
    marginUsage,
    currentMarketData,
    percentage,
    setPercentage,
    tpslConfig,
    tpslConfigHasError,
    setTpslConfig,
    handleTPSLEnabledChange,
    resetForm,
  } = usePerpsTradingState();

  const estPrice = useRabbySelector((state) => state.perps.marketEstPrice);
  const [slippageVisible, setSlippageVisible] = React.useState(false);

  useEffect(() => {
    const isBuy = orderSide === OrderSide.BUY;
    if (!Number(positionSize.amount)) {
      return;
    }
    const marketEstSize = isBuy
      ? positionSize.amount
      : `-${positionSize.amount}`;
    dispatch.perps.patchState({
      marketEstSize,
    });
  }, [positionSize.amount, orderSide]);

  // Form validation
  const validation = React.useMemo(() => {
    let error: string = '';
    const notionalNum = Number(positionSize.notionalValue) || 0;
    const tradeSize = Number(positionSize.amount) || 0;

    if (notionalNum === 0) {
      return {
        isValid: false,
        error:
          reduceOnly && percentage > 0
            ? t('page.perpsPro.tradingPanel.reduceOnlyTooLarge')
            : '',
      };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      error = t('page.perpsPro.tradingPanel.minimumOrderSize');
      return { isValid: false, error };
    }

    if (maxTradeSize && tradeSize > Number(maxTradeSize)) {
      error = reduceOnly
        ? t('page.perpsPro.tradingPanel.reduceOnlyTooLarge')
        : t('page.perpsPro.tradingPanel.insufficientBalance');
      return { isValid: false, error };
    }

    // Check maximum position size
    const maxUsdValue = Number(currentMarketData?.maxUsdValueSize || 1000000);
    if (notionalNum > maxUsdValue) {
      error =
        t('page.perpsPro.tradingPanel.maximumOrderSize', {
          amount: `$${maxUsdValue}`,
        }) || `Maximum order size is $${maxUsdValue}`;
      return { isValid: false, error };
    }

    return {
      isValid: error === '',
      error,
    };
  }, [
    positionSize.notionalValue,
    maxTradeSize,
    reduceOnly,
    tradeSize,
    currentMarketData,
    t,
  ]);

  const {
    handleOpenMarketOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenMarketOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        midPx: midPrice.toString(),
        tpTriggerPx: tpslConfig.takeProfit.price,
        slTriggerPx: tpslConfig.stopLoss.price,
        reduceOnly,
        slippage: marketSlippage,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {},
    }
  );

  const orderSummary: OrderSummaryData = React.useMemo(() => {
    const estSlippage =
      estPrice && Number(positionSize.amount) > 0
        ? (Number(estPrice) - Number(markPrice)) / Number(markPrice)
        : 0;

    const getExpectedPnL = (percentage: string) => {
      return Number(percentage) && Number(tradeSize) > 0
        ? (Number(percentage) * marginRequired) / 100
        : 0;
    };
    const orderValue = Number(tradeSize) * Number(markPrice);
    return {
      tpExpectedPnL: 1 * getExpectedPnL(tpslConfig.takeProfit.percentage),
      slExpectedPnL: -1 * getExpectedPnL(tpslConfig.stopLoss.percentage),
      liquidationPrice: estimatedLiquidationPrice,
      liquidationDistance: '',
      orderValue:
        orderValue > 0
          ? formatUsdValue(orderValue, BigNumber.ROUND_DOWN)
          : '$0.00',
      marginRequired: reduceOnly ? '-' : formatUsdValue(orderValue / leverage),
      marginUsage,
      slippage: `Est. ${formatPercent(
        Math.abs(estSlippage),
        4
      )} / Max ${formatPercent(marketSlippage, 2)}`,
    };
  }, [
    tpslConfig.takeProfit.percentage,
    tpslConfig.stopLoss.percentage,
    tradeSize,
    reduceOnly,
    marginRequired,
    tradeUsdAmount,
    estimatedLiquidationPrice,
    marginUsage,
    marketSlippage,
    estPrice,
    leverage,
  ]);

  const handleSetSlippage = () => {
    setSlippageVisible(true);
  };

  return (
    <>
      <div className="space-y-[16px]">
        {/* Buy/Sell Tabs */}
        <OrderSideAndFunds
          orderSide={orderSide}
          switchOrderSide={switchOrderSide}
          availableBalance={availableBalance}
          currentPosition={currentPosition}
          selectedCoin={selectedCoin}
        />

        {/* Position Size Input */}
        <PositionSizeInputAndSlider
          price={midPrice}
          maxTradeSize={maxTradeSize}
          positionSize={positionSize}
          setPositionSize={setPositionSize}
          percentage={percentage}
          setPercentage={setPercentage}
          baseAsset={selectedCoin}
          quoteAsset="USDC"
          szDecimals={szDecimals}
          reduceOnly={reduceOnly}
        />

        {/* TP/SL and Reduce Only */}
        <div className="flex items-center gap-16">
          <PerpsCheckbox
            checked={tpslConfig.enabled}
            onChange={(enabled) => {
              handleTPSLEnabledChange(enabled);
              if (enabled) {
                setReduceOnly(false);
              }
            }}
            tooltipText={t('page.perpsPro.tradingPanel.tpSlTips')}
            title={t('page.perpsPro.tradingPanel.tpSl')}
          />
          <PerpsCheckbox
            checked={reduceOnly}
            onChange={(checked) => {
              setReduceOnly(checked);
              if (checked) {
                handleTPSLEnabledChange(false);
              }
            }}
            tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
            title={t('page.perpsPro.tradingPanel.reduceOnly')}
            disabled={!currentPosition}
          />
        </div>

        {/* TP/SL Settings Expanded */}
        {tpslConfig.enabled && (
          <TPSLSettings
            szDecimals={szDecimals}
            config={tpslConfig}
            setConfig={setTpslConfig}
            orderSide={orderSide}
            price={midPrice}
            leverage={leverage}
          />
        )}

        {/* Place Order Button */}
        {needEnableTrading ? (
          <Button
            onClick={handleActionApproveStatus}
            className={
              'w-full h-[40px] rounded-[8px] font-medium text-[13px] mt-20 border-transparent bg-rb-green-default text-rb-neutral-InvertHighlight'
            }
          >
            {t('page.perpsPro.tradingPanel.enableTrading')}
          </Button>
        ) : (
          <TradingButton
            loading={handleOpenOrderLoading}
            onClick={handleOpenOrderRequest}
            disabled={!validation.isValid || tpslConfigHasError}
            error={validation.error}
            isValid={validation.isValid}
            orderSide={orderSide}
            titleText={
              orderSide === OrderSide.BUY
                ? t('page.perpsPro.tradingPanel.buyLong')
                : t('page.perpsPro.tradingPanel.sellShort')
            }
          />
        )}

        {/* Order Summary */}
        <OrderSummary
          data={orderSummary}
          showTPSLExpected={tpslConfig.enabled}
          tpExpectedPnL={
            tpslConfig.enabled ? orderSummary?.tpExpectedPnL : undefined
          }
          handleSetSlippage={handleSetSlippage}
          slExpectedPnL={
            tpslConfig.enabled ? orderSummary?.slExpectedPnL : undefined
          }
        />
      </div>

      <EditMarketSlippage
        visible={slippageVisible}
        onCancel={() => setSlippageVisible(false)}
      />
    </>
  );
};
