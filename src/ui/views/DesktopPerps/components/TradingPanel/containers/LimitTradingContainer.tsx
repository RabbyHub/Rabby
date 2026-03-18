import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import {
  LimitOrderType,
  OrderSide,
  OrderSideInfo,
  TradingContainerProps,
} from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { Dropdown, Menu, Tooltip } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButtons } from '../components/TradingButtons';
import { BigNumber } from 'bignumber.js';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { calcAmountFromPercentage } from '../utils';
import { PerpsDropdown } from '../components';

export const LimitTradingContainer: React.FC<TradingContainerProps> = () => {
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
    leverage,
    availableBalance,
    reduceOnly,
    setReduceOnly,
    tradeSize,
    maxBuyTradeSize,
    maxSellTradeSize,
    currentMarketData,
    percentage,
    setPercentage,
    tpslConfig,
    tpslConfigHasError,
    setTpslConfig,
    handleTPSLEnabledChange,
    resetForm,
    validateTpslForSide,
    sizeDisplayUnit,
    setSizeDisplayUnit,
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
    calcDirectionInfo,
    buyTradeSize,
    sellTradeSize,
  } = usePerpsTradingState();
  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );
  const hasFillLimitPrice = React.useRef(false);
  useEffect(() => {
    if (!hasFillLimitPrice.current && midPrice) {
      setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
      hasFillLimitPrice.current = true;
    }
  }, [midPrice, szDecimals]);
  // Estimated execution price per direction:
  // limitPrice > midPrice → Buy executes at market (midPrice), Sell goes on book (limitPrice)
  // limitPrice < midPrice → Buy goes on book (limitPrice), Sell executes at market (midPrice)
  const estBuyPrice = Math.min(Number(limitPrice) || midPrice, midPrice);
  const estSellPrice = Math.max(Number(limitPrice) || midPrice, midPrice);

  const limitMaxBuyTradeSize = React.useMemo(() => {
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
  ]);

  const limitMaxSellTradeSize = React.useMemo(() => {
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
  ]);

  // Use hook's calcDirectionInfo with direction-specific estPrice
  const buyDirInfo = React.useMemo(
    () => calcDirectionInfo('Long', buyTradeSize, estBuyPrice),
    [calcDirectionInfo, buyTradeSize, estBuyPrice]
  );
  const sellDirInfo = React.useMemo(
    () => calcDirectionInfo('Short', sellTradeSize, estSellPrice),
    [calcDirectionInfo, sellTradeSize, estSellPrice]
  );

  const [limitOrderType, setLimitOrderType] = React.useState<LimitOrderType>(
    'Gtc'
  );

  const wsActiveAssetCtx = useRabbySelector(
    (state) => state.perps.wsActiveAssetCtx
  );

  const { currentBestAskPrice, currentBestBidPrice } = React.useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === selectedCoin) {
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

  // Form validation (direction-agnostic, ALO check moved to button click)
  const validation = React.useMemo(() => {
    let error: string = '';
    const tradeSize = Number(positionSize.amount) || 0;
    const notionalNum = tradeSize * Number(limitPrice || 0);

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      error = t('page.perpsPro.tradingPanel.minimumOrderSize');
      return { isValid: false, error };
    }

    // Check max trade size (shared: use max of both directions)
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          currentPosition?.side === 'Long'
            ? limitMaxSellTradeSize
            : limitMaxBuyTradeSize || 0
        )
      : Math.max(
          Number(limitMaxBuyTradeSize || 0),
          Number(limitMaxSellTradeSize || 0)
        );
    if (isFinite(effectiveMaxTradeSize) && tradeSize > effectiveMaxTradeSize) {
      error = t('page.perpsPro.tradingPanel.insufficientBalance');
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
    positionSize.amount,
    reduceOnly,
    limitPrice,
    percentage,
    currentMarketData,
    currentPosition,
    limitMaxBuyTradeSize,
    limitMaxSellTradeSize,
    t,
  ]);

  // Per-side validation (ALO constraints only — max size check is in shared validation)
  const buyValidation = React.useMemo(() => {
    if (!validation.isValid) return validation;
    if (
      limitOrderType === 'Alo' &&
      Number(limitPrice) >= Number(currentBestAskPrice)
    ) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.aloTooLargeBuy'),
      };
    }
    return validation;
  }, [validation, limitOrderType, limitPrice, currentBestAskPrice, t]);

  const sellValidation = React.useMemo(() => {
    if (!validation.isValid) return validation;
    if (
      limitOrderType === 'Alo' &&
      Number(limitPrice) <= Number(currentBestBidPrice)
    ) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.aloTooLargeSell'),
      };
    }
    return validation;
  }, [validation, limitOrderType, limitPrice, currentBestBidPrice, t]);

  const { handleOpenLimitOrder } = usePerpsProPosition();

  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? limitMaxBuyTradeSize : limitMaxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return tradeSize;
  };

  const openOrder = React.useCallback(
    async (isBuy: boolean) => {
      // Validate TP/SL for this direction
      const side = isBuy ? OrderSide.BUY : OrderSide.SELL;
      if (tpslConfig.enabled) {
        const tpslValidation = validateTpslForSide(side);
        if (!tpslValidation.valid) {
          const newConfig = { ...tpslConfig };
          if (tpslValidation.errors.tp) {
            newConfig.takeProfit = {
              ...newConfig.takeProfit,
              error: tpslValidation.errors.tp,
            };
          }
          if (tpslValidation.errors.sl) {
            newConfig.stopLoss = {
              ...newConfig.stopLoss,
              error: tpslValidation.errors.sl,
            };
          }
          setTpslConfig(newConfig);
          throw new Error('Invalid TP/SL configuration');
        }
      }

      // Determine TP/SL trigger prices based on mode
      const getTriggerPrice = (
        item: typeof tpslConfig.takeProfit
      ): string | undefined => {
        if (!tpslConfig.enabled || !item.value) return undefined;
        if (item.settingMode === 'price') {
          return item.value;
        }
        return isBuy ? item.buyTriggerPrice : item.sellTriggerPrice;
      };

      const directionSize = getDirectionTradeSize(isBuy);

      await handleOpenLimitOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        limitPx: limitPrice,
        tpTriggerPx: getTriggerPrice(tpslConfig.takeProfit),
        slTriggerPx: getTriggerPrice(tpslConfig.stopLoss),
        reduceOnly,
        orderType: limitOrderType,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'limit',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: limitPrice,
        trade_usd_value: new BigNumber(limitPrice).times(tradeSize).toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
      if (tpslConfig.enabled) {
        const tpTrigger = getTriggerPrice(tpslConfig.takeProfit);
        tpTrigger &&
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'take profit in limit',
            leverage: leverage.toString(),
            trade_side: getStatsReportSide(!isBuy, reduceOnly),
            margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
            coin: selectedCoin,
            size: tradeSize,
            price: tpTrigger,
            trade_usd_value: new BigNumber(tpTrigger)
              .times(tradeSize)
              .toFixed(2),
            service_provider: 'hyperliquid',
            app_version: process.env.release || '0',
            address_type: currentPerpsAccount?.type || '',
          });
        const slTrigger = getTriggerPrice(tpslConfig.stopLoss);
        slTrigger &&
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'stop market in limit',
            leverage: leverage.toString(),
            trade_side: getStatsReportSide(!isBuy, reduceOnly),
            margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
            coin: selectedCoin,
            size: tradeSize,
            price: slTrigger,
            trade_usd_value: new BigNumber(slTrigger)
              .times(tradeSize)
              .toFixed(2),
            service_provider: 'hyperliquid',
            app_version: process.env.release || '0',
            address_type: currentPerpsAccount?.type || '',
          });
      }
    },
    [
      selectedCoin,
      tradeSize,
      limitPrice,
      tpslConfig,
      reduceOnly,
      limitOrderType,
      leverage,
      leverageType,
      currentPerpsAccount,
      handleOpenLimitOrder,
      validateTpslForSide,
      setTpslConfig,
    ]
  );

  const { run: handleBuyOrder, loading: buyLoading } = useRequest(
    () => openOrder(true),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: () => {},
    }
  );

  const { run: handleSellOrder, loading: sellLoading } = useRequest(
    () => openOrder(false),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: () => {},
    }
  );

  // Build OrderSideInfo for buy and sell (using hook's calcDirectionInfo)
  const buyOrderInfo: OrderSideInfo = React.useMemo(
    () => ({
      liqPrice: buyDirInfo.liqPrice,
      cost: buyDirInfo.cost,
      max: limitMaxBuyTradeSize || '0',
    }),
    [buyDirInfo, limitMaxBuyTradeSize]
  );

  const sellOrderInfo: OrderSideInfo = React.useMemo(
    () => ({
      liqPrice: sellDirInfo.liqPrice,
      cost: sellDirInfo.cost,
      max: limitMaxSellTradeSize || '0',
    }),
    [sellDirInfo, limitMaxSellTradeSize]
  );

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
    <div className="space-y-[12px]">
      <OrderSideAndFunds availableBalance={availableBalance} />

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.price')}
        </span>
        <div className="flex items-center gap-8">
          <DesktopPerpsInput
            value={limitPrice}
            onChange={handleLimitPriceChange}
            className="text-left"
            suffix={
              <span className="text-15 font-medium text-rb-neutral-foot">
                USDC
              </span>
            }
          />
          <div
            className="w-[88px] h-[44px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-15 text-r-neutral-title-1 rounded-[8px] cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
            onClick={handleMidClick}
          >
            Mid
          </div>
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={limitPrice}
        maxBuyTradeSize={limitMaxBuyTradeSize}
        maxSellTradeSize={limitMaxSellTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        szDecimals={szDecimals}
        sizeDisplayUnit={sizeDisplayUnit}
        onUnitChange={setSizeDisplayUnit}
        reduceOnly={reduceOnly}
      />

      <div className="h-[1px] bg-rb-neutral-line" />

      <div className="flex flex-col gap-[6px]">
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
          disabled={reduceOnly}
        />
        {tpslConfig.enabled && (
          <TPSLSettings
            szDecimals={szDecimals}
            config={tpslConfig}
            setConfig={setTpslConfig}
            price={limitPrice}
            leverage={leverage}
            tradeSize={tradeSize}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-4">
          <PerpsDropdown
            options={limitOrderTypeOptions.map(({ label, value, title }) => ({
              key: value,
              label,
              title,
            }))}
            onSelect={(value) => setLimitOrderType(value as LimitOrderType)}
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
          </PerpsDropdown>
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <TradingButtons
        onBuyClick={handleBuyOrder}
        onSellClick={handleSellOrder}
        buyLoading={buyLoading}
        sellLoading={sellLoading}
        buyDisabled={
          !buyValidation.isValid || tpslConfigHasError || reduceOnlyBuyDisabled
        }
        sellDisabled={
          !sellValidation.isValid ||
          tpslConfigHasError ||
          reduceOnlySellDisabled
        }
        buyError={buyValidation.error}
        sellError={sellValidation.error}
      />

      {/* Order Info Grid */}
      <OrderInfoGrid
        buy={buyOrderInfo}
        sell={sellOrderInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
      />
    </div>
  );
};
