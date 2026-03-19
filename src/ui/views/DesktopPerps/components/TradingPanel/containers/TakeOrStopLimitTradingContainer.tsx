import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderSideInfo } from '../../../types';
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

interface TakeOrStopLimitTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
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
    sizeDisplayUnit,
    setSizeDisplayUnit,
    resetForm,
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
    calcDirectionInfo,
    buyTradeSize,
    sellTradeSize,
  } = usePerpsTradingState();
  const bboPrices = useRabbySelector((state) => state.perps.bboPrices);
  const [triggerPrice, setTriggerPrice] = React.useState('');
  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );

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

  // Estimated execution price per direction
  const estBuyPrice = Math.min(Number(buyLimitPrice) || midPrice, midPrice);
  const estSellPrice = Math.max(Number(sellLimitPrice) || midPrice, midPrice);

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
      const orderLimitPrice = isBuy ? buyLimitPrice : sellLimitPrice;
      await handleOpenTPSlLimitOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        triggerPx: triggerPrice,
        limitPx: orderLimitPrice,
        reduceOnly,
        tpsl: takeOrStop,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          takeOrStop === 'tp' ? 'take profit limit' : 'stop loss limit',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: orderLimitPrice,
        trade_usd_value: new BigNumber(orderLimitPrice)
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
      const orderLimitPrice = isBuy ? buyLimitPrice : sellLimitPrice;
      await handleOpenTPSlLimitOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        triggerPx: triggerPrice,
        limitPx: orderLimitPrice,
        reduceOnly,
        tpsl: takeOrStop,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          takeOrStop === 'tp' ? 'take profit limit' : 'stop loss limit',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: orderLimitPrice,
        trade_usd_value: new BigNumber(orderLimitPrice)
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

  // Build OrderSideInfo using hook's calcDirectionInfo
  const limitBuyInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: buyDirInfo.liqPrice,
      cost: buyDirInfo.cost,
      max: limitMaxBuyTradeSize || '0',
    }),
    [buyDirInfo, limitMaxBuyTradeSize]
  );

  const limitSellInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: sellDirInfo.liqPrice,
      cost: sellDirInfo.cost,
      max: limitMaxSellTradeSize || '0',
    }),
    [sellDirInfo, limitMaxSellTradeSize]
  );

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
              <span className="text-15 font-medium text-rb-neutral-title-1">
                USDC
              </span>
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.limitPrice')}
        </span>
        <div className="flex items-center gap-8">
          {bboEnabled ? (
            <PerpsDropdown
              options={bboStrategyOptions}
              onSelect={(key) => setBboStrategy(key as BboStrategy)}
            >
              <div className="flex-1 h-[44px] flex items-center justify-between px-[11px] rounded-[8px] border border-solid border-rb-neutral-line bg-rb-neutral-bg-5 cursor-pointer">
                <span className="text-[15px] font-medium text-rb-neutral-title-1">
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
                <span className="text-15 font-medium text-rb-neutral-title-1">
                  USDC
                </span>
              }
            />
          )}
          <Tooltip
            overlayClassName="rectangle"
            placement="topRight"
            prefixCls="perps-slider-tip"
            title={undefined}
          >
            <div
              className={clsx(
                'min-w-[64px] h-[44px] relative flex items-center justify-center text-center font-medium text-15 rounded-[8px] border border-solid cursor-pointer',
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
        buy={limitBuyInfo}
        sell={limitSellInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
        price={midPrice}
      />
    </div>
  );
};
