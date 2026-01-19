import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import {
  LimitOrderType,
  OrderSide,
  OrderSummaryData,
  TradingContainerProps,
} from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderSummary } from '../components/OrderSummary';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { Button, Dropdown, Menu, Select, Tooltip } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSlider';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';
import { TradingButton } from '../components/TradingButton';

export const LimitTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

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
  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );
  const [limitOrderType, setLimitOrderType] = React.useState<LimitOrderType>(
    'Gtc'
  );

  const wsActiveAssetCtx = useRabbySelector(
    (state) => state.perps.wsActiveAssetCtx
  );

  const { currentBestAskPrice, currentBestBidPrice } = React.useMemo(() => {
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === selectedCoin.toUpperCase()
    ) {
      const impactPxs = wsActiveAssetCtx?.ctx.impactPxs;
      return {
        currentBestAskPrice: Number(impactPxs[1] || 0),
        currentBestBidPrice: Number(impactPxs[0] || 0),
      };
    }
    return {
      currentBestAskPrice: midPrice,
      currentBestBidPrice: midPrice,
    };
  }, [wsActiveAssetCtx, markPrice, selectedCoin]);

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

    // post-only order price must be lower than the best ask price to avoid immediately matching
    if (
      limitOrderType === 'Alo' &&
      orderSide === OrderSide.BUY &&
      Number(limitPrice) >= Number(currentBestAskPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.aloTooLargeBuy');
      return { isValid: false, error };
    }
    if (
      limitOrderType === 'Alo' &&
      orderSide === OrderSide.SELL &&
      Number(limitPrice) <= Number(currentBestBidPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.aloTooLargeSell');
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
    limitOrderType,
    limitPrice,
    percentage,
    tradeSize,
    marginRequired,
    availableBalance,
    currentMarketData,
    currentBestAskPrice,
    currentBestBidPrice,
    midPrice,
    t,
  ]);

  const {
    handleOpenLimitOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenLimitOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        limitPx: limitPrice,
        tpTriggerPx: tpslConfig.takeProfit.price,
        slTriggerPx: tpslConfig.stopLoss.price,
        reduceOnly,
        orderType: limitOrderType,
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
    return {
      tpExpectedPnL:
        Number(tpslConfig.takeProfit.percentage) && Number(tradeSize) > 0
          ? '+' +
            formatUsdValue(
              (Number(tpslConfig.takeProfit.percentage) * marginRequired) / 100
            )
          : '',
      slExpectedPnL:
        Number(tpslConfig.stopLoss.percentage) && Number(tradeSize) > 0
          ? '-' +
            formatUsdValue(
              (Number(tpslConfig.stopLoss.percentage) * marginRequired) / 100
            )
          : '',
      liquidationPrice: reduceOnly ? '-' : estimatedLiquidationPrice,
      liquidationDistance: '',
      orderValue: tradeUsdAmount > 0 ? formatUsdValue(tradeUsdAmount) : '$0.00',
      marginRequired: reduceOnly ? '-' : formatUsdValue(marginRequired),
      marginUsage,
      slippage: undefined,
    };
  }, [
    estimatedLiquidationPrice,
    tradeUsdAmount,
    marginUsage,
    reduceOnly,
    tpslConfig.takeProfit.percentage,
    tpslConfig.stopLoss.percentage,
    tradeSize,
    marginRequired,
  ]);

  const limitOrderTypeOptions = [
    {
      label: 'GTC',
      value: 'Gtc',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Gtc'),
    },
    {
      label: 'IOC',
      value: 'Ioc',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Ioc'),
    },
    {
      label: 'ALO',
      value: 'Alo',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Alo'),
    },
  ];

  const handleMidClick = () => {
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };

  useEffect(() => {
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  }, [selectedCoin]);

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

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setLimitPrice(value);
    }
  };

  return (
    <div className="space-y-[16px]">
      <OrderSideAndFunds
        orderSide={orderSide}
        switchOrderSide={switchOrderSide}
        availableBalance={availableBalance}
        currentPosition={currentPosition}
        selectedCoin={selectedCoin}
      />

      <div className="flex items-center gap-8">
        <DesktopPerpsInput
          value={limitPrice}
          onChange={handleLimitPriceChange}
          className="text-right tet"
          prefix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {t('page.perpsPro.tradingPanel.limitPrice')}
            </span>
          }
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              USD
            </span>
          }
        />
        <div
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
          onClick={handleMidClick}
        >
          Mid
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={limitPrice}
        maxTradeSize={maxTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        szDecimals={szDecimals}
        priceChangeUsdValue={true}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16">
          <PerpsCheckbox
            checked={tpslConfig.enabled}
            onChange={(enabled) => {
              handleTPSLEnabledChange(enabled);
              if (enabled) {
                setReduceOnly(false);
              }
            }}
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
            title={t('page.perpsPro.tradingPanel.reduceOnly')}
            disabled={!currentPosition}
          />
        </div>
        <div className="flex items-center gap-4">
          <Dropdown
            transitionName=""
            forceRender={true}
            overlay={
              <Menu
                onClick={(info) =>
                  setLimitOrderType(info.key as LimitOrderType)
                }
              >
                {limitOrderTypeOptions.map((option) => (
                  <Menu.Item key={option.value}>
                    <Tooltip key={option.value} title={option.title}>
                      {option.label}
                    </Tooltip>
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-between',
                'px-[8px] py-[8px] flex-1 w-[80px] h-28',
                'border border-rb-neutral-line rounded-[6px]',
                'text-[12px] leading-[14px] font-medium text-rb-neutral-title-1 hover:border-rb-brand-default'
              )}
            >
              {
                limitOrderTypeOptions.find(
                  (option) => option.value === limitOrderType
                )?.label
              }
              <RcIconArrowDownCC className="text-rb-neutral-secondary" />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* TP/SL Settings Expanded */}
      {tpslConfig.enabled && (
        <TPSLSettings
          szDecimals={szDecimals}
          config={tpslConfig}
          setConfig={setTpslConfig}
          orderSide={orderSide}
          price={limitPrice}
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
          titleText={t('page.perpsPro.tradingPanel.placeOrder')}
        />
      )}
      {/* Order Summary */}
      <OrderSummary
        data={orderSummary}
        showTPSLExpected={tpslConfig.enabled}
        tpExpectedPnL={
          tpslConfig.enabled ? orderSummary?.tpExpectedPnL : undefined
        }
        slExpectedPnL={
          tpslConfig.enabled ? orderSummary?.slExpectedPnL : undefined
        }
      />
    </div>
  );
};
