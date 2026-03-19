import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
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

interface TakeOrStopMarketTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
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
    reduceOnly,
    setReduceOnly,
    tradeUsdAmount,
    marginRequired,
    tradeSize,
    buyEstLiqPrice,
    sellEstLiqPrice,
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
          currentPosition?.side === 'Long'
            ? maxSellTradeSize
            : maxBuyTradeSize || 0
        )
      : Math.max(Number(maxBuyTradeSize || 0), Number(maxSellTradeSize || 0));

    if (isFinite(effectiveMaxTradeSize) && tradeSize > effectiveMaxTradeSize) {
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

  const { run: handleBuyOrder, loading: buyLoading } = useRequest(
    async () => {
      const isBuy = true;

      // Trigger price direction validation
      if (isStopLoss) {
        if (Number(triggerPrice) <= midPrice) {
          perpsToast.error({
            title: t('page.perps.toast.orderError'),
            description: t(
              'page.perpsPro.tradingPanel.slBuyMustBeHigherThanMidPrice'
            ),
          });
          throw new Error(
            t('page.perpsPro.tradingPanel.slBuyMustBeHigherThanMidPrice')
          );
        }
      } else {
        if (Number(triggerPrice) >= midPrice) {
          perpsToast.error({
            title: t('page.perps.toast.orderError'),
            description: t(
              'page.perpsPro.tradingPanel.tpBuyMustBeLowerThanMidPrice'
            ),
          });
          throw new Error(
            t('page.perpsPro.tradingPanel.tpBuyMustBeLowerThanMidPrice')
          );
        }
      }

      const directionSize = getDirectionTradeSize(isBuy);
      await handleOpenTPSlMarketOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        triggerPx: triggerPrice,
        reduceOnly,
        tpsl: takeOrStop,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          takeOrStop === 'tp' ? 'take profit market' : 'stop loss market',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: triggerPrice,
        trade_usd_value: new BigNumber(triggerPrice)
          .times(tradeSize)
          .toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
    },
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {
        console.error('open limit order error', error);
      },
    }
  );

  const { run: handleSellOrder, loading: sellLoading } = useRequest(
    async () => {
      const isBuy = false;

      // Trigger price direction validation
      if (isStopLoss) {
        if (Number(triggerPrice) >= midPrice) {
          perpsToast.error({
            title: t('page.perps.toast.orderError'),
            description: t(
              'page.perpsPro.tradingPanel.slSellMustBeLowerThanMidPrice'
            ),
          });
          throw new Error(
            t('page.perpsPro.tradingPanel.slSellMustBeLowerThanMidPrice')
          );
        }
      } else {
        if (Number(triggerPrice) <= midPrice) {
          perpsToast.error({
            title: t('page.perps.toast.orderError'),
            description: t(
              'page.perpsPro.tradingPanel.tpSellMustBeHigherThanMidPrice'
            ),
          });
          throw new Error(
            t('page.perpsPro.tradingPanel.tpSellMustBeHigherThanMidPrice')
          );
        }
      }

      const directionSize = getDirectionTradeSize(isBuy);
      await handleOpenTPSlMarketOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        triggerPx: triggerPrice,
        reduceOnly,
        tpsl: takeOrStop,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          takeOrStop === 'tp' ? 'take profit market' : 'stop loss market',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: triggerPrice,
        trade_usd_value: new BigNumber(triggerPrice)
          .times(tradeSize)
          .toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
    },
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {
        console.error('open limit order error', error);
      },
    }
  );

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
    <div className="space-y-[16px]">
      <OrderSideAndFunds availableBalance={availableBalance} />

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.triggerPrice')}
        </span>
        <div className="flex items-center gap-8">
          <DesktopPerpsInput
            value={triggerPrice}
            onChange={handleTriggerPriceChange}
            className="text-left"
            suffix={
              <span className="text-15 font-medium text-rb-neutral-foot">
                USDC
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
        szDecimals={szDecimals}
        sizeDisplayUnit={sizeDisplayUnit}
        onUnitChange={setSizeDisplayUnit}
        reduceOnly={reduceOnly}
      />

      <div className="h-[1px] bg-rb-neutral-line" />

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
        onBuyClick={handleBuyOrder}
        onSellClick={handleSellOrder}
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
      />
    </div>
  );
};
