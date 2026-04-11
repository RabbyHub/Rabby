import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import { OrderSide, TradingContainerProps } from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { EditMarketSlippage } from '../components/EditMarketSlippage';
import { TradingButtons } from '../components/TradingButtons';
import BigNumber from 'bignumber.js';
import { formatPercent } from '@/ui/views/Perps/utils';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { calcAmountFromPercentage } from '../utils';

export const MarketTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get slippage from Redux
  const marketSlippage = useRabbySelector(
    (state) => state.perps.marketSlippage
  );

  const estPrice = useRabbySelector((state) => state.perps.marketEstPrice);

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
    leverage,
    leverageType,
    availableBalance,
    reduceOnly,
    setReduceOnly,
    tradeUsdAmount,
    marginRequired,
    tradeSize,
    buyInfo,
    sellInfo,
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
  } = usePerpsTradingState();

  const [slippageVisible, setSlippageVisible] = React.useState(false);

  // Form validation (direction-agnostic)
  const validation = React.useMemo(() => {
    let error: string = '';
    const size = Number(positionSize.amount) || 0;
    const notionalNum = size * Number(markPrice || 0);

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      error = t('page.perpsPro.tradingPanel.minimumOrderSize');
      return { isValid: false, error };
    }

    // Check max trade size
    // reduceOnly: check against the opposite direction's max (position size)
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          (currentPosition?.side === 'Long'
            ? maxSellTradeSize
            : maxBuyTradeSize) || 0
        )
      : Math.max(Number(maxBuyTradeSize || 0), Number(maxSellTradeSize || 0));
    if (effectiveMaxTradeSize > 0 && size > effectiveMaxTradeSize) {
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
    markPrice,
    positionSize.amount,
    maxBuyTradeSize,
    maxSellTradeSize,
    reduceOnly,
    tradeSize,
    currentMarketData,
    percentage,
    t,
  ]);

  // Direction-specific validation
  const { handleOpenMarketOrder } = usePerpsProPosition();

  const getTpSlTriggerPrices = (isBuy: boolean) => {
    if (!tpslConfig.enabled) {
      return { tpTriggerPx: undefined, slTriggerPx: undefined };
    }

    const tpItem = tpslConfig.takeProfit;
    const slItem = tpslConfig.stopLoss;

    const tpTriggerPx =
      tpItem.settingMode === 'price'
        ? tpItem.value
        : isBuy
        ? tpItem.buyTriggerPrice
        : tpItem.sellTriggerPrice;

    const slTriggerPx =
      slItem.settingMode === 'price'
        ? slItem.value
        : isBuy
        ? slItem.buyTriggerPrice
        : slItem.sellTriggerPrice;

    return {
      tpTriggerPx: tpTriggerPx || undefined,
      slTriggerPx: slTriggerPx || undefined,
    };
  };

  const reportOrderStats = (isBuy: boolean, totalSz: string, avgPx: string) => {
    stats.report('perpsTradeHistory', {
      created_at: new Date().getTime(),
      user_addr: currentPerpsAccount?.address || '',
      trade_type: 'market',
      leverage: leverage.toString(),
      trade_side: getStatsReportSide(isBuy, reduceOnly),
      margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
      coin: selectedCoin,
      size: totalSz,
      price: avgPx,
      trade_usd_value: new BigNumber(avgPx).times(totalSz).toFixed(2),
      service_provider: 'hyperliquid',
      app_version: process.env.release || '0',
      address_type: currentPerpsAccount?.type || '',
    });

    if (tpslConfig.enabled) {
      const { tpTriggerPx, slTriggerPx } = getTpSlTriggerPrices(isBuy);
      if (tpTriggerPx) {
        stats.report('perpsTradeHistory', {
          created_at: new Date().getTime(),
          user_addr: currentPerpsAccount?.address || '',
          trade_type: 'take profit in market',
          leverage: leverage.toString(),
          trade_side: getStatsReportSide(!isBuy, reduceOnly),
          margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
          coin: selectedCoin,
          size: totalSz,
          price: tpTriggerPx,
          trade_usd_value: new BigNumber(tpTriggerPx).times(totalSz).toFixed(2),
          service_provider: 'hyperliquid',
          app_version: process.env.release || '0',
          address_type: currentPerpsAccount?.type || '',
        });
      }
      if (slTriggerPx) {
        stats.report('perpsTradeHistory', {
          created_at: new Date().getTime(),
          user_addr: currentPerpsAccount?.address || '',
          trade_type: 'stop loss in market',
          leverage: leverage.toString(),
          trade_side: getStatsReportSide(!isBuy, reduceOnly),
          margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
          coin: selectedCoin,
          size: totalSz,
          price: slTriggerPx,
          trade_usd_value: new BigNumber(slTriggerPx).times(totalSz).toFixed(2),
          service_provider: 'hyperliquid',
          app_version: process.env.release || '0',
          address_type: currentPerpsAccount?.type || '',
        });
      }
    }
  };

  // Get direction-specific trade size: percentage mode recalculates per direction
  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? maxBuyTradeSize : maxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return tradeSize;
  };

  const createOrderHandler = (isBuy: boolean) => async () => {
    // Validate TP/SL for this direction
    if (tpslConfig.enabled) {
      const tpslValidation = validateTpslForSide(
        isBuy ? OrderSide.BUY : OrderSide.SELL
      );
      if (!tpslValidation.valid) {
        setTpslConfig({
          ...tpslConfig,
          takeProfit: {
            ...tpslConfig.takeProfit,
            error: tpslValidation.errors.tp || '',
          },
          stopLoss: {
            ...tpslConfig.stopLoss,
            error: tpslValidation.errors.sl || '',
          },
        });
        throw new Error('TP/SL validation failed');
      }
    }

    const { tpTriggerPx, slTriggerPx } = getTpSlTriggerPrices(isBuy);
    const directionSize = getDirectionTradeSize(isBuy);

    const res = await handleOpenMarketOrder({
      coin: selectedCoin,
      isBuy,
      size: directionSize,
      midPx: midPrice.toString(),
      tpTriggerPx,
      slTriggerPx,
      reduceOnly,
      slippage: marketSlippage,
    });

    if (res) {
      const { totalSz, avgPx } = res;
      reportOrderStats(isBuy, totalSz, avgPx);
    }
  };

  const { run: handleBuyOrder, loading: buyLoading } = useRequest(
    createOrderHandler(true),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: () => {},
    }
  );

  const { run: handleSellOrder, loading: sellLoading } = useRequest(
    createOrderHandler(false),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: () => {},
    }
  );

  const slippageDisplay = useMemo(() => {
    // const estSlippage =
    //   estPrice && Number(positionSize.amount) > 0
    //     ? (Number(estPrice) - Number(midPrice)) / Number(midPrice)
    //     : 0;

    // return `Est. ${formatPercent(
    //   Math.abs(estSlippage),
    //   4
    // )} / Max ${formatPercent(marketSlippage, 0)}`;
    return `Max ${formatPercent(marketSlippage, 2)}`;
  }, [estPrice, positionSize.amount, midPrice, marketSlippage]);

  const handleSetSlippage = () => {
    setSlippageVisible(true);
  };

  const buyDisabled =
    !validation.isValid || tpslConfigHasError || reduceOnlyBuyDisabled;
  const sellDisabled =
    !validation.isValid || tpslConfigHasError || reduceOnlySellDisabled;

  return (
    <>
      <div className="space-y-[16px]">
        {/* Available Funds */}
        <OrderSideAndFunds availableBalance={availableBalance} />

        {/* Position Size Input */}
        <PositionSizeInputAndSlider
          price={midPrice}
          maxBuyTradeSize={maxBuyTradeSize}
          maxSellTradeSize={maxSellTradeSize}
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

        {/* TP/SL, Reduce Only, and Slippage */}
        <div className="flex flex-col gap-[8px]">
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
          {/* TP/SL Settings Expanded */}
          {tpslConfig.enabled && (
            <TPSLSettings
              config={tpslConfig}
              setConfig={setTpslConfig}
              szDecimals={szDecimals}
              price={midPrice}
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
          <div className="ml-auto flex items-center gap-[4px]">
            <span className="text-rb-neutral-secondary text-[12px]">
              {t('page.perpsPro.tradingPanel.slippage')}
            </span>
            <span
              onClick={handleSetSlippage}
              className="text-r-neutral-title-1 font-medium text-[12px] cursor-pointer underline decoration-dashed underline-offset-2"
            >
              {slippageDisplay}
            </span>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <TradingButtons
          onBuyClick={handleBuyOrder}
          onSellClick={handleSellOrder}
          buyLoading={buyLoading}
          sellLoading={sellLoading}
          buyDisabled={buyDisabled}
          sellDisabled={sellDisabled}
          buyError={validation.error || undefined}
          sellError={validation.error || undefined}
        />

        {/* Order Info Grid */}
        <OrderInfoGrid
          buy={buyInfo}
          sell={sellInfo}
          displayUnit={sizeDisplayUnit}
          selectedCoin={selectedCoin}
          reduceOnly={reduceOnly}
          price={midPrice}
        />
      </div>

      <EditMarketSlippage
        visible={slippageVisible}
        onCancel={() => setSlippageVisible(false)}
      />
    </>
  );
};
