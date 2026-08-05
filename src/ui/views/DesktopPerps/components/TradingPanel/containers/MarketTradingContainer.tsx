import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { OrderSide, TradingContainerProps } from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useMemoizedFn, useRequest } from 'ahooks';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { EditMarketSlippage } from '../components/EditMarketSlippage';
import { TradingButtons } from '../components/TradingButtons';
import BigNumber from 'bignumber.js';
import { formatPercent } from '@/ui/views/Perps/utils';
import stats from '@/stats';
import { formatPerpsCoin, getStatsReportSide } from '../../../utils';
import { resolveTriggerComparator } from '../../../tpslTrigger';
import { calcAmountFromPercentage } from '../utils';
import { perpsToast } from '../../PerpsToast';
import { useOrderConfirm } from '../../../modal/OrderConfirmProvider';
import type { OrderConfirmContent } from '../../../modal/OrderConfirmProvider';
import type {
  OrderConfirmRow,
  OrderConfirmSection,
} from '../../../modal/OrderConfirmModal';

/** The numbers an order actually sends, frozen at click time. */
interface MarketOrderSnapshot {
  size: string;
  tpTriggerPx?: string;
  slTriggerPx?: string;
}

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

  const reportOrderStats = (
    isBuy: boolean,
    totalSz: string,
    avgPx: string,
    snapshot: MarketOrderSnapshot
  ) => {
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
      const { tpTriggerPx, slTriggerPx } = snapshot;
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

  // Both the size and the PNL/ROI trigger prices are re-derived from the
  // streaming balance and mark price, while the dialog's rows are built once at
  // click time and `submit` runs whenever the user confirms. Freezing them into
  // one snapshot is what keeps the order that is sent identical to the one that
  // was shown.
  const buildOrderSnapshot = useMemoizedFn(
    (isBuy: boolean): MarketOrderSnapshot => ({
      size: getDirectionTradeSize(isBuy),
      ...getTpSlTriggerPrices(isBuy),
    })
  );

  // Runs twice per submit: at click time, so an invalid form never opens the
  // confirmation dialog, and again inside the handler, which also guards submits
  // that skip the dialog.
  //
  // `reportError` toasts rather than leaving it to the inline field error: the
  // trigger is checked against the streaming mark price, so the second pass can
  // fail while the dialog is up and its inline error sits behind the mask.
  const validateTpslForDirection = useMemoizedFn(
    (isBuy: boolean, reportError = false) => {
      if (!tpslConfig.enabled) return true;

      const tpslValidation = validateTpslForSide(
        isBuy ? OrderSide.BUY : OrderSide.SELL
      );
      if (tpslValidation.valid) return true;

      if (reportError) {
        perpsToast.error({
          title: t('page.perps.toast.orderError'),
          description: tpslValidation.errors.tp || tpslValidation.errors.sl,
        });
      }

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
      return false;
    }
  );

  const createOrderHandler = (isBuy: boolean) => async (
    snapshot: MarketOrderSnapshot
  ) => {
    if (!validateTpslForDirection(isBuy, true)) {
      throw new Error('TP/SL validation failed');
    }

    const res = await handleOpenMarketOrder({
      coin: selectedCoin,
      dex: currentMarketData?.dexId ?? '',
      isBuy,
      size: snapshot.size,
      // Deliberately not snapshotted: `midPx` is the reference the slippage
      // bound is priced against, so it has to be the freshest one available.
      midPx: midPrice.toString(),
      tpTriggerPx: snapshot.tpTriggerPx,
      slTriggerPx: snapshot.slTriggerPx,
      reduceOnly,
      slippage: marketSlippage,
    });

    if (res) {
      const { totalSz, avgPx } = res;
      reportOrderStats(isBuy, totalSz, avgPx, snapshot);
    }
  };

  // `runAsync` (not `run`) so the confirmation dialog can await the submission
  // and keep itself open when it rejects.
  const { runAsync: handleBuyOrder, loading: buyLoading } = useRequest(
    createOrderHandler(true),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: () => {},
    }
  );

  const { runAsync: handleSellOrder, loading: sellLoading } = useRequest(
    createOrderHandler(false),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: () => {},
    }
  );

  const requestConfirm = useOrderConfirm();

  const buildConfirmContent = useMemoizedFn(
    (isBuy: boolean, snapshot: MarketOrderSnapshot): OrderConfirmContent => {
      const coinLabel = formatPerpsCoin(selectedCoin);
      const markPriceNum = Number(markPrice || 0);
      const rows: OrderConfirmRow[] = [
        {
          key: 'price',
          label: t('page.perpsPro.orderConfirm.price'),
          value: t('page.perpsPro.orderConfirm.marketPrice'),
        },
      ];

      if (markPriceNum > 0) {
        rows.push({
          key: 'markPrice',
          label: t('page.perpsPro.orderConfirm.markPrice'),
          value: `${splitNumberByStep(
            markPriceNum.toFixed(pxDecimals)
          )} ${quoteAsset}`,
        });
      }

      if (Number(snapshot.size) > 0) {
        rows.push({
          key: 'amount',
          label: t('page.perpsPro.orderConfirm.amount'),
          value: `${snapshot.size} ${coinLabel}`,
        });
      }

      // Same source as the panel's OrderInfoGrid, down to the reduce-only rule:
      // an order that only closes exposure has no new liquidation price.
      const { liqPrice, liqPriceNum } = isBuy ? buyInfo : sellInfo;
      if (!reduceOnly && liqPriceNum !== null && markPriceNum > 0) {
        const delta = liqPriceNum - markPriceNum;
        rows.push(
          {
            key: 'estLiqPrice',
            label: t('page.perpsPro.orderConfirm.estLiqPrice'),
            value: liqPrice,
          },
          {
            key: 'estLiqDistance',
            label: t('page.perpsPro.orderConfirm.estLiqDistance'),
            value: `${formatPercent(
              delta / markPriceNum,
              2
            )}(${splitNumberByStep(delta.toFixed(pxDecimals))})`,
          }
        );
      }

      rows.push({
        key: 'reduceOnly',
        label: t('page.perpsPro.orderConfirm.reduceOnly'),
        value: reduceOnly
          ? t('page.perpsPro.orderConfirm.true')
          : t('page.perpsPro.orderConfirm.false'),
      });

      const sections: OrderConfirmSection[] = [{ key: 'main', rows }];

      const { tpTriggerPx, slTriggerPx } = snapshot;
      const markPriceLabel = t('page.perpsPro.orderConfirm.markPrice');
      const tpslRows: OrderConfirmRow[] = [];

      if (tpTriggerPx && Number(tpTriggerPx) > 0) {
        tpslRows.push(
          {
            key: 'tp',
            label: t('page.perpsPro.orderConfirm.takeProfitMarket'),
            value: t('page.perpsPro.orderConfirm.marketPrice'),
          },
          {
            key: 'tpTrigger',
            label: t('page.perpsPro.orderConfirm.trigger'),
            value: `${markPriceLabel}${resolveTriggerComparator(
              isBuy,
              true
            )}${splitNumberByStep(tpTriggerPx)} ${quoteAsset}`,
          }
        );
      }

      if (slTriggerPx && Number(slTriggerPx) > 0) {
        tpslRows.push(
          {
            key: 'sl',
            label: t('page.perpsPro.orderConfirm.stopLossMarket'),
            value: t('page.perpsPro.orderConfirm.marketPrice'),
          },
          {
            key: 'slTrigger',
            label: t('page.perpsPro.orderConfirm.trigger'),
            value: `${markPriceLabel}${resolveTriggerComparator(
              isBuy,
              false
            )}${splitNumberByStep(slTriggerPx)} ${quoteAsset}`,
          }
        );
      }

      if (tpslRows.length > 0) {
        sections.push({
          key: 'tpsl',
          heading: t('page.perpsPro.orderConfirm.tpSl'),
          rows: tpslRows,
        });
      }

      return {
        title: `${coinLabel}-${quoteAsset}`,
        titleSuffix: isBuy
          ? { text: t('page.perpsPro.orderConfirm.buyLong'), tone: 'up' }
          : { text: t('page.perpsPro.orderConfirm.sellShort'), tone: 'down' },
        sections,
      };
    }
  );

  const handleSubmitClick = useMemoizedFn((isBuy: boolean) => {
    // Keep the direction-specific TP/SL check ahead of the dialog: otherwise the
    // user would confirm an order that can only fail validation.
    if (!validateTpslForDirection(isBuy)) return;

    const snapshot = buildOrderSnapshot(isBuy);

    requestConfirm({
      type: 'market',
      content: () => buildConfirmContent(isBuy, snapshot),
      dontShowAgainText: t('page.perpsPro.orderConfirm.dontShowAgain', {
        orderType: t('page.perpsPro.orderConfirm.orderTypeName.market'),
      }),
      submit: () =>
        isBuy ? handleBuyOrder(snapshot) : handleSellOrder(snapshot),
    });
  });

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
      <div className="flex flex-col gap-[12px]">
        {/* Available Funds */}
        <OrderSideAndFunds
          availableBalance={availableBalance}
          quoteAsset={quoteAsset}
        />

        {/* Position Size Input — 18px above (Funds → Size) */}
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
            <span className="text-rb-neutral-secondary text-12">
              {t('page.perpsPro.tradingPanel.slippage')}
            </span>
            <span
              onClick={handleSetSlippage}
              className="text-r-neutral-body text-12 cursor-pointer underline decoration-dashed underline-offset-2"
            >
              {slippageDisplay}
            </span>
          </div>
        </div>

        {/* Buy/Sell Buttons */}
        <TradingButtons
          onBuyClick={() => handleSubmitClick(true)}
          onSellClick={() => handleSubmitClick(false)}
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
          quoteAsset={quoteAsset}
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
